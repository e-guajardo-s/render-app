// En: frontend/src/pages/SemaphorePage.jsx

import React, { useState, useEffect } from 'react';
import api from '../api'; 
import { useAuth } from '../context/AuthContext';
import './SemaphorePage.css';

function SemaphorePage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    // Estados
    const [cruce, setCruce] = useState('');
    const [cruceId, setCruceId] = useState('');
    const [red, setRed] = useState('');
    const [controlador, setControlador] = useState('');
    const [UOCT, setUOCT] = useState('');
    const [coordenadas, setCoordenadas] = useState('');
    const [comuna, setComuna] = useState('');
    
    const [isEditing, setIsEditing] = useState(null);
    const [formError, setFormError] = useState('');
    const [formMessage, setFormMessage] = useState('');

    const [semaphores, setSemaphores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Carga de datos
    const fetchSemaphores = async () => {
        setError('');
        try {
            const response = await api.get('/api/semaphores'); 
            if (Array.isArray(response.data)) setSemaphores(response.data);
            else { setError('Formato inesperado.'); setSemaphores([]); }
        } catch (err) {
            setError(err.response?.data?.message || 'Error cargando datos.');
            setSemaphores([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { setLoading(true); fetchSemaphores(); }, []);

    const resetForm = () => {
        setCruce(''); setCruceId(''); setRed(''); setControlador(''); setUOCT(''); setCoordenadas(''); setComuna('');
        setIsEditing(null); setFormMessage(''); setFormError('');
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormMessage(''); setFormError('');
        const data = { cruce, cruceId, comuna, red, controlador, UOCT, coordenadas };
        try {
            if (isEditing) {
                await api.put(`/api/semaphores/${isEditing}`, data);
                setFormMessage('¡Semáforo actualizado correctamente!');
            } else {
                await api.post('/api/semaphores', data);
                setFormMessage('¡Semáforo creado con éxito!');
            }
            resetForm(); fetchSemaphores();
        } catch (err) {
            setFormError(err.response?.data?.message || 'Error en la operación.');
        }
    };

    const handleEdit = (sem) => {
        setIsEditing(sem._id);
        setCruce(sem.cruce); setCruceId(sem.cruceId); setRed(sem.red || ''); 
        setControlador(sem.controlador || ''); setUOCT(sem.UOCT || '');
        setCoordenadas(sem.coordenadas ? `${sem.coordenadas.lat}, ${sem.coordenadas.lng}` : '');
        setComuna(sem.comuna || '');
        setFormMessage(''); setFormError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id, nombre) => {
        if (window.confirm(`¿Eliminar definitivamente "${nombre}"?`)) {
            setError(''); setFormMessage('');
            try {
                await api.delete(`/api/semaphores/${id}`);
                setFormMessage('Elemento eliminado.');
                fetchSemaphores();
                if (isEditing === id) resetForm();
            } catch (err) { setError('Error al eliminar.'); }
        }
    };

    const isSemaphoreOffline = (sem) => !sem.status || sem.status.controlador === undefined;

    const handleToggleStatus = async (sem) => {
        const isOffline = isSemaphoreOffline(sem);
        const action = isOffline ? 'set_online' : 'set_offline';
        const msg = isOffline 
            ? `¿Activar "${sem.cruce}"?\n(Esperará conexión MQTT)`
            : `¿Desconectar "${sem.cruce}"?\n(Dejará de recibir datos)`;

        if (window.confirm(msg)) {
            try {
                await api.put(`/api/semaphores/${sem._id}/status`, { action });
                fetchSemaphores();
            } catch (err) { alert('Error cambiando estado.'); }
        }
    };

    return (
        <div className="page-content semaphore-page"> 
            
            {/* ENCABEZADO */}
            <div className="page-header">
                <h2 className="page-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:'32px', color:'#ff9900'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    Gestión de Semáforos
                </h2>
                <p className="page-subtitle">Administra los cruces, coordenadas y configuraciones de la red.</p>
            </div>

            {/* FORMULARIO (CARD) */}
            {isAdmin && (
                 <div className="semaphore-card">
                    <h3 className="card-title">
                        {isEditing ? '✏️ Editar Cruce' : '➕ Nuevo Cruce'}
                    </h3>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="cruce">Nombre del Cruce</label>
                                <input type="text" className="form-input" placeholder="Ej: Av. Pajaritos con Vespucio" id="cruce" value={cruce} onChange={(e) => setCruce(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="cruceId">Identificador (ID)</label>
                                <input type="text" className="form-input" placeholder="Ej: ST-001" id="cruceId" value={cruceId} onChange={(e) => setCruceId(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="comuna">Comuna</label>
                                <input type="text" className="form-input" placeholder="Ej: Maipú" id="comuna" value={comuna} onChange={(e) => setComuna(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor="red">Red</label>
                                <input type="text" className="form-input" id="red" value={red} onChange={(e) => setRed(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="controlador">Controlador</label>
                                <input type="text" className="form-input" id="controlador" value={controlador} onChange={(e) => setControlador(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label htmlFor="uoct">UOCT</label>
                                <input type="text" className="form-input" id="uoct" value={UOCT} onChange={(e) => setUOCT(e.target.value)} />
                            </div>
                            
                            {/* --- CAMPO COORDENADAS CON TUTORIAL (ACTIVADO) --- */}
                            <div className="form-group full-width">
                                <label htmlFor="coordenadas">Coordenadas (Latitud, Longitud)</label>
                                <input type="text" className="form-input" id="coordenadas" value={coordenadas} onChange={(e) => setCoordenadas(e.target.value)} placeholder="-33.xxxxx, -70.xxxxx" />
                                
                                {/* CAJA DE AYUDA (HINT) */}
                                <div className="coords-hint-box">
                                    <div className="hint-content">
                                        <span className="hint-icon">💡</span>
                                        <p>
                                            <strong>¿Cómo obtener las coordenadas?</strong><br/>
                                            Para colocar las coordenadas debes ir a Google Maps, establecer un punto en el mapa con un click y <strong>copiar los números azules</strong> que aparecen abajo.
                                        </p>
                                    </div>
                                    <div className="hint-image-placeholder">
                                        {/* IMAGEN ACTIVADA */}
                                        <img 
                                            src="public/tutorial-coords.png" 
                                            alt="Ejemplo Coordenadas" 
                                            onError={(e) => {
                                                e.target.onerror = null; 
                                                e.target.style.display = 'none';
                                                e.target.parentNode.innerHTML = '<span>Imagen no encontrada</span>';
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* -------------------------------------- */}

                        </div>

                        {formMessage && <div className="feedback-msg msg-success">{formMessage}</div>}
                        {formError && <div className="feedback-msg msg-error">{formError}</div>}

                        <div className="form-actions">
                            {isEditing && (<button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar</button>)}
                            <button type="submit" className="btn btn-primary">
                                {isEditing ? 'Guardar Cambios' : 'Crear Semáforo'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* LISTA (CARD) */}
            <div className="semaphore-card">
                <h3 className="card-title">📡 Listado de Cruces Activos</h3>
                
                {loading && <p style={{textAlign:'center', color:'#666'}}>Cargando datos...</p>}
                {!loading && error && <div className="feedback-msg msg-error">{error}</div>}
                {!loading && !error && semaphores.length === 0 && <p style={{textAlign:'center'}}>No hay registros.</p>}

                {!loading && !error && semaphores.length > 0 && (
                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Cruce</th>
                                    <th>ID</th>
                                    <th>Comuna</th>
                                    <th>UOCT</th>
                                    {isAdmin && <th style={{textAlign:'right'}}>Gestión</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {semaphores.map((sem) => {
                                    const isOffline = isSemaphoreOffline(sem);
                                    return (
                                        <tr key={sem._id}>
                                            <td style={{fontWeight:'600'}}>{sem.cruce}</td>
                                            <td><span style={{background:'#f1f5f9', padding:'2px 6px', borderRadius:'4px', fontSize:'0.85rem'}}>{sem.cruceId}</span></td>
                                            <td>{sem.comuna || '-'}</td>
                                            <td>{sem.UOCT || '-'}</td>
                                            {isAdmin && (
                                                <td>
                                                    <div className="action-buttons">
                                                        <button 
                                                            className={`btn btn-icon btn-status ${isOffline ? 'status-online' : 'status-offline'}`}
                                                            onClick={() => handleToggleStatus(sem)}
                                                        >
                                                            {isOffline ? '⚡ Activar' : '💤 Pausar'}
                                                        </button>
                                                        <button className="btn btn-icon btn-edit" onClick={() => handleEdit(sem)}>Editar</button>
                                                        <button className="btn btn-icon btn-delete" onClick={() => handleDelete(sem._id, sem.cruce)}>Borrar</button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default SemaphorePage;