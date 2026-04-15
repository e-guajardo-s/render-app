// En: backend/routes/document.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fsPromises = require('fs').promises; // Usamos promesas para no bloquear el servidor
const Semaphore = require('../models/Semaphore.model');
const { verifyToken, verifyTokenAndAdmin } = require('../authMiddleware');

// --- Configuración de Multer (Almacenamiento Local Mejorado) ---
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/');
        try {
            // Verifica si la carpeta existe, si no, la crea de forma asíncrona
            await fsPromises.access(uploadPath);
        } catch (error) {
            await fsPromises.mkdir(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

const upload = multer({ storage: storage });

// --- RUTA DE SUBIDA (Solo Admin) ---
router.post(
    '/:semaphoreId/:docType', 
    verifyTokenAndAdmin, 
    upload.single('file'), 
    async (req, res) => {
        try {
            const { semaphoreId, docType } = req.params;
            const docTypesPermitidos = ['planos', 'catastros', 'data'];
            
            if (!docTypesPermitidos.includes(docType)) return res.status(400).json({ message: "Tipo no válido." });
            if (!req.file) return res.status(400).json({ message: "No se subió ningún archivo." });
            
            const semaphore = await Semaphore.findById(semaphoreId);
            if (!semaphore) return res.status(404).json({ message: "Semáforo no encontrado." });

            const newFile = {
                originalname: req.file.originalname,
                filename: req.file.filename,
                path: req.file.path,
                mimetype: req.file.mimetype,
                size: req.file.size
            };

            semaphore.documentos[docType].push(newFile);
            await semaphore.save();
            
            res.status(200).json(semaphore);
        } catch (error) {
            console.error("Error al subir archivo:", error);
            res.status(500).json({ message: "Error interno al subir archivo." });
        }
    }
);

// --- RUTA DE DESCARGA ---
router.get('/download/:fileId', verifyToken, async (req, res) => {
    try {
        const { fileId } = req.params;

        const semaphore = await Semaphore.findOne({
            $or: [
                { "documentos.planos._id": fileId },
                { "documentos.catastros._id": fileId },
                { "documentos.data._id": fileId }
            ]
        });

        if (!semaphore) return res.status(404).json({ message: "Archivo no encontrado (ref)." });

        let fileDoc = null;
        ['planos', 'catastros', 'data'].forEach(type => {
            const found = semaphore.documentos[type].id(fileId);
            if (found) fileDoc = found;
        });

        if (!fileDoc) return res.status(404).json({ message: "Archivo no encontrado (doc)." });

        const filePath = path.join(__dirname, '../uploads/', fileDoc.filename);

        // Verificación asíncrona
        try {
            await fsPromises.access(filePath);
            res.download(filePath, fileDoc.originalname);
        } catch (err) {
            res.status(404).json({ message: "Archivo no encontrado físicamente en el servidor." });
        }

    } catch (error) {
        console.error("Error al descargar:", error);
        res.status(500).json({ message: "Error interno al descargar archivo." });
    }
});

// --- RUTA DE BORRADO ---
router.delete(
    '/:semaphoreId/:docType/:fileId', 
    verifyTokenAndAdmin, 
    async (req, res) => {
        try {
            const { semaphoreId, docType, fileId } = req.params;

            const docTypesPermitidos = ['planos', 'catastros', 'data'];
            if (!docTypesPermitidos.includes(docType)) return res.status(400).json({ message: "Tipo no válido." });

            const semaphore = await Semaphore.findById(semaphoreId);
            if (!semaphore) return res.status(404).json({ message: "Semáforo no encontrado." });

            const fileDoc = semaphore.documentos[docType].id(fileId);
            if (!fileDoc) return res.status(404).json({ message: "Referencia no encontrada." });
            
            // 1. Borrado físico asíncrono (no bloquea el servidor)
            const filePath = path.join(__dirname, '../uploads/', fileDoc.filename);
            try {
                await fsPromises.unlink(filePath);
            } catch (err) {
                console.warn(`Archivo físico no encontrado para borrar: ${filePath}`);
            }

            // 2. Quitar la referencia de MongoDB
            semaphore.documentos[docType].pull(fileId);
            await semaphore.save();
            
            res.status(200).json(semaphore);

        } catch (error) {
            console.error("Error al eliminar:", error);
            res.status(500).json({ message: "Error interno al eliminar archivo." });
        }
    }
);

module.exports = router;