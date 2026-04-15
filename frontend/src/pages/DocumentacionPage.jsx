// En: frontend/src/pages/DocumentacionPage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom'; 
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './DocumentacionPage.css';

// --- Subcomponente: Sección de Documentos ---
const DocumentSection = ({ title, docType, files = [], isAdmin, onUpload, onDelete }) => {
    const [file, setFile] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = () => {
        if (!file) {
            alert("Por favor, seleccione un archivo.");
            return;
        }
        onUpload(docType, file);
        setFile(null); 
    };
    
    const handleDownload = async (fileId, originalname) => {
        try {
            const response = await api.get(`/api/docs/download/${fileId}`, {
                responseType: 'blob', 
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', originalname);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
        } catch (error) {
            console.error("Error descarga:", error);
            alert("Error al descargar el archivo.");
        }
    };

    return (
        <div className="doc-category-section">
            <h4>
                {/* Icono decorativo según tipo */}
                {title === 'Planos' && '📐'} 
                {title === 'Catastros' && '📋'} 
                {title.includes('Data') && '💾'} 
                &nbsp; {title}
            </h4>
            
            {isAdmin && (
                <div className="upload-wrapper">
                    <input type="file" onChange={handleFileChange} />
                    <button className="btn-upload" onClick={handleUpload} disabled={!file}>
                        Subir
                    </button>
                </div>
            )}

            <ul className="file-list">
                {files.length === 0 ? (
                    <li style={{fontSize:'0.85rem', color:'#94a3b8', fontStyle:'italic'}}>No hay archivos disponibles.</li>
                ) : (
                    files.map(f => (
                        <li key={f._id} className="file-item">
                            <div className="file-info" title={f.originalname}>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="file-icon-small">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                </svg>
                                <span className="file-name">{f.originalname}</span>
                            </div>
                            <div className="file-actions">
                                <button 
                                    className="btn-icon-action btn-download"
                                    onClick={() => handleDownload(f._id, f.originalname)}
                                    title="Descargar"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 12.75l-3.25-3.25M12 12.75l3.25-3.25M12 12.75V3" />
                                    </svg>
                                </button>
                                {isAdmin && (
                                    <button 
                                        className="btn-icon-action btn-delete"
                                        onClick={() => onDelete(docType, f._id, f.originalname)}
                                        title="Eliminar"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

// --- Función Normalizar ---
const normalizeString = (str) => {
    if (!str) return '';
    return str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,]/g, ""); 
};

// --- Página Principal ---
function DocumentacionPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
    
    const [semaphores, setSemaphores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [selectedSemaphoreId, setSelectedSemaphoreId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const [searchParams] = useSearchParams();
    const semIdFromQuery = searchParams.get('semId');

    const fetchSemaphores = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/semaphores');
            setSemaphores(response.data);
        } catch (err) {
            setError("Error al cargar semáforos.");
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => { fetchSemaphores(); }, []);

    useEffect(() => {
        if (semIdFromQuery && !loading) {
            setSelectedSemaphoreId(semIdFromQuery);
            setTimeout(() => {
                const element = document.getElementById(`doc-${semIdFromQuery}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
        }
    }, [semIdFromQuery, loading]);

    const filteredSemaphores = useMemo(() => {
        const normalizedSearchTerm = normalizeString(searchTerm.trim());
        
        // 1. Filtrar
        let results = semaphores;
        if (normalizedSearchTerm) {
            results = semaphores.filter(sem => {
                const normalizedCruce = normalizeString(sem.cruce);
                const normalizedCruceId = normalizeString(sem.cruceId);
                return (
                    (normalizedCruce && normalizedCruce.includes(normalizedSearchTerm)) ||
                    (normalizedCruceId && normalizedCruceId.includes(normalizedSearchTerm))
                );
            });
        }

        // 2. Ordenar por cruceId (Alfanumérico: ST-1, ST-2, ST-10...)
        return [...results].sort((a, b) => {
            const idA = a.cruceId || "";
            const idB = b.cruceId || "";
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [semaphores, searchTerm]);

    const toggleSemaphore = (id) => {
        setSelectedSemaphoreId(prevId => (prevId === id ? null : id));
    };
    
    const handleUpload = async (semaphoreId, docType, file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await api.post(`/api/docs/${semaphoreId}/${docType}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSemaphores(prev => prev.map(sem => (sem._id === semaphoreId ? response.data : sem)));
        } catch (err) {
            alert("Error al subir el archivo: " + (err.response?.data?.message || "Error"));
        }
    };

    const handleDelete = async (semaphoreId, docType, fileId, filename) => {
        if (!window.confirm(`¿Eliminar archivo "${filename}"?`)) return;
        try {
            const response = await api.delete(`/api/docs/${semaphoreId}/${docType}/${fileId}`);
            setSemaphores(prev => prev.map(sem => (sem._id === semaphoreId ? response.data : sem)));
        } catch (err) {
            alert("Error al eliminar: " + (err.response?.data?.message || "Error"));
        }
    };

    return (
        <div className="page-content doc-page-container">
            
            {/* Encabezado */}
            <div className="page-header">
                <h2 className="page-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:'32px', color:'#ff9900'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                    Gestión de Documentación
                </h2>
                <p className="page-subtitle">Repositorio central de planos, catastros y fichas técnicas por cruce.</p>
            </div>
            
            {/* Buscador */}
            <div className="doc-search-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="search-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                    type="search"
                    className="doc-search-input"
                    placeholder="Buscar cruce por nombre o ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            {loading && <p className="loading-msg">Cargando semáforos...</p>}
            {error && <p className="error-msg">{error}</p>}
            
            <div className="semaphore-list-docs">
                {filteredSemaphores.length > 0 ? (
                    filteredSemaphores.map(sem => (
                        <div 
                            key={sem._id} 
                            id={`doc-${sem._id}`} 
                            className={`doc-accordion-card ${selectedSemaphoreId === sem._id ? 'active' : ''}`}
                        >
                            <button 
                                className="accordion-header" 
                                onClick={() => toggleSemaphore(sem._id)}
                            >
                                <div className="header-info">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="folder-icon">
                                        <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
                                    </svg>
                                    <div>
                                        <div className="sem-title">{sem.cruce}</div>
                                    </div>
                                    <span className="sem-id">{sem.cruceId}</span>
                                </div>
                                
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    fill="none" 
                                    viewBox="0 0 24 24" 
                                    strokeWidth={2} 
                                    stroke="currentColor" 
                                    className={`chevron-icon ${selectedSemaphoreId === sem._id ? 'rotate-down' : ''}`}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                            </button>
                            
                            {selectedSemaphoreId === sem._id && (
                                <div className="doc-content-body">
                                    <DocumentSection 
                                        title="Planos" docType="planos" files={sem.documentos?.planos} 
                                        isAdmin={isAdmin} onUpload={(d, f) => handleUpload(sem._id, d, f)} onDelete={(d, fid, fn) => handleDelete(sem._id, d, fid, fn)} 
                                    />
                                    <DocumentSection 
                                        title="Catastros" docType="catastros" files={sem.documentos?.catastros} 
                                        isAdmin={isAdmin} onUpload={(d, f) => handleUpload(sem._id, d, f)} onDelete={(d, fid, fn) => handleDelete(sem._id, d, fid, fn)} 
                                    />
                                    <DocumentSection 
                                        title="Data (Fichas)" docType="data" files={sem.documentos?.data} 
                                        isAdmin={isAdmin} onUpload={(d, f) => handleUpload(sem._id, d, f)} onDelete={(d, fid, fn) => handleDelete(sem._id, d, fid, fn)} 
                                    />
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    !loading && <p style={{textAlign:'center', color:'#94a3b8'}}>No se encontraron resultados.</p>
                )}
            </div>
        </div>
    );
}

export default DocumentacionPage;