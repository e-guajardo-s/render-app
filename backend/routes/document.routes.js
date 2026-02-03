// En: backend/routes/document.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Semaphore = require('../models/Semaphore.model');
const { verifyToken, verifyTokenAndAdmin } = require('../authMiddleware');

// --- Configuración de Multer (Almacenamiento) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads/');
        // Asegurarse que la carpeta 'uploads' exista
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Crear un nombre único para evitar colisiones
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});

const upload = multer({ storage: storage });

// --- RUTA DE SUBIDA (Solo Admin) ---
// POST /api/docs/:semaphoreId/:docType
router.post(
    '/:semaphoreId/:docType', 
    verifyTokenAndAdmin, 
    upload.single('file'), // 'file' debe coincidir con el nombre del FormData
    async (req, res) => {
        try {
            const { semaphoreId, docType } = req.params;
            
            // Validar docType
            const docTypesPermitidos = ['planos', 'catastros', 'data'];
            if (!docTypesPermitidos.includes(docType)) {
                return res.status(400).json({ message: "Tipo de documento no válido." });
            }

            if (!req.file) {
                return res.status(400).json({ message: "No se subió ningún archivo." });
            }
            
            const semaphore = await Semaphore.findById(semaphoreId);
            if (!semaphore) {
                return res.status(404).json({ message: "Semáforo no encontrado." });
            }

            const newFile = {
                originalname: req.file.originalname,
                filename: req.file.filename,
                path: req.file.path,
                mimetype: req.file.mimetype,
                size: req.file.size
            };

            // Añadir el archivo al array correspondiente
            semaphore.documentos[docType].push(newFile);
            await semaphore.save();
            
            // Devolvemos el semáforo actualizado
            res.status(200).json(semaphore);

        } catch (error) {
            console.error("Error al subir archivo:", error);
            res.status(500).json({ message: "Error interno al subir archivo." });
        }
    }
);


// --- RUTA DE DESCARGA (Todos los usuarios logueados) ---
// GET /api/docs/download/:fileId
router.get('/download/:fileId', verifyToken, async (req, res) => {
    try {
        const { fileId } = req.params;

        // Buscar el semáforo que contiene este fileId
        const semaphore = await Semaphore.findOne({
            $or: [
                { "documentos.planos._id": fileId },
                { "documentos.catastros._id": fileId },
                { "documentos.data._id": fileId }
            ]
        });

        if (!semaphore) {
            return res.status(404).json({ message: "Archivo no encontrado (ref)." });
        }

        // Encontrar el documento específico
        let fileDoc = null;
        ['planos', 'catastros', 'data'].forEach(type => {
            const found = semaphore.documentos[type].id(fileId);
            if (found) fileDoc = found;
        });

        if (!fileDoc) {
            return res.status(404).json({ message: "Archivo no encontrado (doc)." });
        }

        const filePath = path.join(__dirname, '../uploads/', fileDoc.filename);

        // Verificar que el archivo exista en el disco
        if (fs.existsSync(filePath)) {
            // Enviar el archivo para descarga forzada
            res.download(filePath, fileDoc.originalname, (err) => {
                if (err) {
                    console.error("Error al descargar archivo:", err);
                }
            });
        } else {
            res.status(404).json({ message: "Archivo no encontrado en el servidor." });
        }

    } catch (error) {
        console.error("Error al descargar:", error);
        res.status(500).json({ message: "Error interno al descargar archivo." });
    }
});


// --- RUTA DE BORRADO (CORREGIDA) ---
// DELETE /api/docs/:semaphoreId/:docType/:fileId
router.delete(
    '/:semaphoreId/:docType/:fileId', 
    verifyTokenAndAdmin, 
    async (req, res) => {
        try {
            const { semaphoreId, docType, fileId } = req.params;

            const docTypesPermitidos = ['planos', 'catastros', 'data'];
            if (!docTypesPermitidos.includes(docType)) {
                return res.status(400).json({ message: "Tipo de documento no válido." });
            }

            const semaphore = await Semaphore.findById(semaphoreId);
            if (!semaphore) {
                return res.status(404).json({ message: "Semáforo no encontrado." });
            }

            // Encontrar el archivo (necesitamos su nombre para borrarlo del disco)
            const fileDoc = semaphore.documentos[docType].id(fileId);
            if (!fileDoc) {
                return res.status(404).json({ message: "Referencia de archivo no encontrada." });
            }
            
            // 1. Borrar el archivo del disco
            const filePath = path.join(__dirname, '../uploads/', fileDoc.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            } else {
                console.warn(`Archivo físico no encontrado: ${filePath}`);
            }

            // --- ¡AQUÍ ESTÁ EL ARREGLO! ---
            // 2. Quitar la referencia de la DB usando .pull()
            // ANTES: fileDoc.remove(); 
            semaphore.documentos[docType].pull(fileId);
            // -----------------------------
            
            await semaphore.save(); // Guardar el documento padre
            
            res.status(200).json(semaphore); // Devolver el semáforo actualizado

        } catch (error) {
            console.error("Error al eliminar:", error);
            res.status(500).json({ message: "Error interno al eliminar archivo." });
        }
    }
);


module.exports = router;