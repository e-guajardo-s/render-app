// En: frontend/src/pages/SemaphorePage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { getOverallStatus, STATUS_COLORS } from '../utils/statusHelper';
import { format } from 'date-fns';
import './SemaphorePage.css';

// ─── Iconos SVG corporativos ──────────────────────────────────────────────────
const Ico = {
    History:     () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    Maintenance: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
    MaintEnd:    () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    Play:        () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>,
    Pause:       () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/></svg>,
    Edit:        () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    Delete:      () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
    // Batería horizontal con rayo — estándar universal, clara y profesional
    UPS:   () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
               {/* Cuerpo de la batería */}
               <rect x="1" y="6" width="18" height="12" rx="2"/>
               {/* Terminal positivo */}
               <path d="M23 10v4"/>
               {/* Relleno interior (batería cargada) */}
               <rect x="3" y="8" width="12" height="8" rx="1" fill="currentColor" opacity="0.25"/>
               {/* Rayo central */}
               <path d="M11.5 9.5L9.5 12h4l-2 2.5" strokeWidth="1.6"/>
           </svg>,
    // Batería horizontal vacía con barra diagonal — sin respaldo
    NoUPS: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
               {/* Cuerpo de la batería */}
               <rect x="1" y="6" width="18" height="12" rx="2"/>
               {/* Terminal positivo */}
               <path d="M23 10v4"/>
               {/* Barra diagonal encima */}
               <line x1="4" y1="4" x2="20" y2="20" strokeWidth="2"/>
           </svg>,
    Options:     () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>,
    Close:       () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    Network:     () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="4" height="4" rx="1"/><rect x="10" y="3" width="4" height="4" rx="1"/><rect x="18" y="3" width="4" height="4" rx="1"/><rect x="6" y="17" width="4" height="4" rx="1"/><rect x="14" y="17" width="4" height="4" rx="1"/><path d="M4 7v3a1 1 0 001 1h14a1 1 0 001-1V7"/><path d="M8 21v-3"/><path d="M16 21v-3"/><path d="M12 11v6"/></svg>,
};

// ─── Modal Historial ──────────────────────────────────────────────────────────
function HistoryModal({ sem, onClose }) {
    const [logs, setLogs]       = useState([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays]       = useState(7);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/statuslog/history/${sem.cruceId}?days=${days}`);
            setLogs(res.data);
        } catch { /* silencioso */ }
        finally { setLoading(false); }
    }, [sem.cruceId, days]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const typeColor = { info:'#22c55e', error:'#ef4444', warning:'#f59e0b', ups:'#3b82f6', offline:'#6c757d' };
    const typeLabel = { info:'Normal', error:'Falla', warning:'Anomalía', ups:'UPS', offline:'Sin Señal' };

    return (
        <div className="sem-modal-backdrop" onClick={onClose}>
            <div className="sem-modal-panel" style={{maxWidth:640}} onClick={e=>e.stopPropagation()}>
                <div className="sem-modal-header">
                    <div>
                        <h3 className="sem-modal-title">Historial del cruce</h3>
                        <p className="sem-modal-subtitle">{sem.cruceId} — {sem.cruce}</p>
                    </div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <select value={days} onChange={e=>setDays(Number(e.target.value))} className="sem-modal-select">
                            <option value={1}>Hoy</option>
                            <option value={3}>3 días</option>
                            <option value={7}>7 días</option>
                        </select>
                        <button onClick={onClose} className="sem-modal-close"><Ico.Close /></button>
                    </div>
                </div>
                <div style={{overflowY:'auto',flex:1,padding:'0 1.5rem 1rem'}}>
                    {loading
                        ? <p style={{textAlign:'center',color:'#64748b',padding:'2rem'}}>Cargando...</p>
                        : logs.length === 0
                            ? <p style={{textAlign:'center',color:'#94a3b8',padding:'2rem'}}>Sin eventos en este período.</p>
                            : logs.map((l,i) => (
                                <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start',padding:'10px 0',borderBottom:'1px solid #f1f5f9'}}>
                                    <span style={{background:typeColor[l.type]+'20',color:typeColor[l.type],border:`1px solid ${typeColor[l.type]}40`,padding:'2px 10px',borderRadius:12,fontSize:'0.72rem',fontWeight:700,whiteSpace:'nowrap'}}>
                                        {typeLabel[l.type] || l.type}
                                    </span>
                                    <div style={{flex:1}}>
                                        <p style={{margin:0,fontSize:'0.82rem',color:'#334155'}}>{l.message}</p>
                                        <span style={{fontSize:'0.72rem',color:'#94a3b8'}}>{format(new Date(l.timestamp),'dd/MM/yyyy HH:mm:ss')}</span>
                                    </div>
                                </div>
                            ))
                    }
                </div>
            </div>
        </div>
    );
}

// ─── Modal de opciones centrado ───────────────────────────────────────────────
function OptionsModal({ sem, isAdmin, onClose, onHistorial, onMantención, onActivar, onEditar, onBorrar, onToggleUPS }) {
    return (
        <div className="sem-modal-backdrop" onClick={onClose}>
            <div className="sem-modal-panel options-modal" onClick={e=>e.stopPropagation()}>
                {/* Header */}
                <div className="sem-modal-header">
                    <div>
                        <h3 className="sem-modal-title">{sem.cruce}</h3>
                        <p className="sem-modal-subtitle">ID: {sem.cruceId} · {sem.comuna}</p>
                    </div>
                    <button onClick={onClose} className="sem-modal-close"><Ico.Close /></button>
                </div>

                <div className="options-modal-body">
                    {/* Sección: Información */}
                    <p className="options-section-label">Información</p>
                    <button className="options-action-btn" onClick={() => { onClose(); onHistorial(); }}>
                        <span className="options-action-icon blue"><Ico.History /></span>
                        <div className="options-action-text">
                            <strong>Ver Historial</strong>
                            <span>Eventos y fallas registradas</span>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>

                    {isAdmin && <>
                        {/* Sección: Monitoreo */}
                        <p className="options-section-label" style={{marginTop:16}}>Monitoreo</p>
                        <button className="options-action-btn" onClick={() => { onClose(); onMantención(); }}>
                            <span className={`options-action-icon ${sem.enMantencion ? 'green' : 'amber'}`}>
                                {sem.enMantencion ? <Ico.MaintEnd /> : <Ico.Maintenance />}
                            </span>
                            <div className="options-action-text">
                                <strong>{sem.enMantencion ? 'Finalizar Mantención' : 'Iniciar Mantención'}</strong>
                                <span>{sem.enMantencion ? 'Reanudar monitoreo normal' : 'Pausar alertas temporalmente'}</span>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>

                        <button className="options-action-btn" onClick={() => { onClose(); onActivar(); }}>
                            <span className={`options-action-icon ${sem.monitoreando ? 'slate' : 'green'}`}>
                                {sem.monitoreando ? <Ico.Pause /> : <Ico.Play />}
                            </span>
                            <div className="options-action-text">
                                <strong>{sem.monitoreando ? 'Pausar Monitoreo' : 'Activar Monitoreo'}</strong>
                                <span>{sem.monitoreando ? 'El cruce dejará de recibir datos' : 'El cruce comenzará a recibir datos MQTT'}</span>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>

                        {/* Sección: Configuración UPS inline */}
                        <p className="options-section-label" style={{marginTop:16}}>Respaldo UPS</p>
                        <div className="options-ups-toggle">
                            <button
                                className={`options-ups-btn ${sem.tieneUPS !== false ? 'active' : ''}`}
                                onClick={() => onToggleUPS(sem, true)}
                            >
                                <Ico.UPS />
                                Con UPS
                            </button>
                            <button
                                className={`options-ups-btn ${sem.tieneUPS === false ? 'active' : ''}`}
                                onClick={() => onToggleUPS(sem, false)}
                            >
                                <Ico.NoUPS />
                                Sin UPS
                            </button>
                        </div>

                        {/* Sección: Administración */}
                        <p className="options-section-label" style={{marginTop:16}}>Administración</p>
                        <button className="options-action-btn" onClick={() => { onClose(); onEditar(); }}>
                            <span className="options-action-icon slate"><Ico.Edit /></span>
                            <div className="options-action-text">
                                <strong>Editar Cruce</strong>
                                <span>Modificar datos, coordenadas y configuración</span>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>

                        <button className="options-action-btn danger" onClick={() => { onClose(); onBorrar(); }}>
                            <span className="options-action-icon red"><Ico.Delete /></span>
                            <div className="options-action-text">
                                <strong>Eliminar Cruce</strong>
                                <span>Esta acción no se puede deshacer</span>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                    </>}
                </div>
            </div>
        </div>
    );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
function SemaphorePage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    const [cruce, setCruce]             = useState('');
    const [cruceId, setCruceId]         = useState('');
    const [red, setRed]                 = useState('');
    const [controlador, setControlador] = useState('');
    const [UOCT, setUOCT]               = useState('');
    const [coordenadas, setCoordenadas] = useState('');
    const [comuna, setComuna]           = useState('');
    const [tieneUPS, setTieneUPS]       = useState(true);

    const [isEditing, setIsEditing]       = useState(null);
    const [formError, setFormError]       = useState('');
    const [formMessage, setFormMessage]   = useState('');
    const [semaphores, setSemaphores]     = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState('');

    // Modales
    const [historyTarget, setHistoryTarget]         = useState(null);
    const [optionsTarget, setOptionsTarget]         = useState(null);
    const [maintenanceTarget, setMaintenanceTarget] = useState(null);
    const [maintenanceMotivo, setMaintenanceMotivo] = useState('');

    const fetchSemaphores = async () => {
        setError('');
        try {
            const response = await api.get('/api/semaphores');
            if (Array.isArray(response.data)) {
                const sorted = [...response.data].sort((a, b) => {
                    const nA = parseInt(a.cruceId, 10), nB = parseInt(b.cruceId, 10);
                    if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
                    return String(a.cruceId).localeCompare(String(b.cruceId), undefined, { numeric: true });
                });
                setSemaphores(sorted);
            } else { setError('Formato inesperado.'); setSemaphores([]); }
        } catch (err) {
            setError(err.response?.data?.message || 'Error cargando datos.');
            setSemaphores([]);
        } finally { setLoading(false); }
    };

    useEffect(() => { setLoading(true); fetchSemaphores(); }, []);

    const resetForm = () => {
        setCruce(''); setCruceId(''); setRed(''); setControlador('');
        setUOCT(''); setCoordenadas(''); setComuna(''); setTieneUPS(true);
        setIsEditing(null); setFormMessage(''); setFormError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormMessage(''); setFormError('');
        const data = { cruce, cruceId, comuna, red, controlador, UOCT, coordenadas, tieneUPS };
        try {
            if (isEditing) {
                await api.put(`/api/semaphores/${isEditing}`, data);
                setFormMessage('Semáforo actualizado correctamente.');
            } else {
                await api.post('/api/semaphores', data);
                setFormMessage('Semáforo creado con éxito.');
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
        setTieneUPS(sem.tieneUPS !== false);
        setFormMessage(''); setFormError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id, nombre) => {
        if (window.confirm(`¿Eliminar definitivamente "${nombre}"?`)) {
            setError(''); setFormMessage('');
            try {
                await api.delete(`/api/semaphores/${id}`);
                setFormMessage('Cruce eliminado.');
                fetchSemaphores();
                if (isEditing === id) resetForm();
            } catch { setError('Error al eliminar.'); }
        }
    };

    const handleToggleMaintenance = async (sem) => {
        if (sem.enMantencion) {
            if (!window.confirm(`¿Finalizar mantención de "${sem.cruce}"?`)) return;
            try { await api.put(`/api/semaphores/${sem._id}/maintenance`, { action: 'end' }); fetchSemaphores(); }
            catch { alert('Error al finalizar mantención.'); }
        } else {
            setMaintenanceTarget(sem); setMaintenanceMotivo('');
        }
    };

    const confirmMaintenance = async () => {
        try {
            await api.put(`/api/semaphores/${maintenanceTarget._id}/maintenance`, { action: 'start', motivo: maintenanceMotivo });
            setMaintenanceTarget(null); fetchSemaphores();
        } catch { alert('Error al iniciar mantención.'); }
    };

    const handleToggleStatus = async (sem) => {
        const isOffline = sem.monitoreando === false || sem.monitoreando === undefined;
        const action = isOffline ? 'set_online' : 'set_offline';
        if (window.confirm(isOffline ? `¿Activar monitoreo de "${sem.cruce}"?` : `¿Pausar monitoreo de "${sem.cruce}"?`)) {
            try { await api.put(`/api/semaphores/${sem._id}/status`, { action }); fetchSemaphores(); }
            catch { alert('Error cambiando estado.'); }
        }
    };

    // Cambiar UPS directamente desde el modal de opciones
    const handleToggleUPS = async (sem, value) => {
        try {
            await api.put(`/api/semaphores/${sem._id}`, { tieneUPS: value });
            fetchSemaphores();
            // Actualizar el semáforo en el modal sin cerrarlo
            setOptionsTarget(prev => prev ? { ...prev, tieneUPS: value } : null);
        } catch { alert('Error actualizando UPS.'); }
    };

    return (
        <div className="page-content semaphore-page">
            <div className="page-header">
                <h2 className="page-title">
                    <Ico.Network />
                    Gestión de Semáforos
                </h2>
                <p className="page-subtitle">
                    {isAdmin ? 'Administra los cruces, coordenadas y configuraciones.' : 'Visualización y monitoreo de estado de cruces.'}
                </p>
            </div>

            {/* FORMULARIO */}
            {isAdmin && (
                <div className="semaphore-card">
                    <h3 className="card-title">{isEditing ? 'Editar Cruce' : 'Nuevo Cruce'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Nombre del Cruce</label>
                                <input type="text" className="form-input" placeholder="Ej: Av. Pajaritos con Vespucio" value={cruce} onChange={e=>setCruce(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Identificador (ID)</label>
                                <input type="text" className="form-input" placeholder="Ej: ST-001" value={cruceId} onChange={e=>setCruceId(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Comuna</label>
                                <input type="text" className="form-input" placeholder="Ej: Maipú" value={comuna} onChange={e=>setComuna(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label>Red</label>
                                <input type="text" className="form-input" value={red} onChange={e=>setRed(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>Controlador</label>
                                <input type="text" className="form-input" value={controlador} onChange={e=>setControlador(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>UOCT</label>
                                <input type="text" className="form-input" value={UOCT} onChange={e=>setUOCT(e.target.value)} />
                            </div>
                            <div className="form-group full-width">
                                <label>Coordenadas (Latitud, Longitud)</label>
                                <input type="text" className="form-input" placeholder="-33.xxxxx, -70.xxxxx" value={coordenadas} onChange={e=>setCoordenadas(e.target.value)} />
                                <div className="coords-hint-box">
                                    <div className="hint-content">
                                        <span className="hint-icon">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                        </span>
                                        <p><strong>¿Cómo obtener las coordenadas?</strong><br/>Ve a Google Maps, haz clic en el punto y copia los números que aparecen abajo.</p>
                                    </div>
                                    <div className="hint-image-placeholder">
                                        <img
                                            src="/tutorial-coords.png"
                                            alt="Tutorial coordenadas Google Maps"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Campo tieneUPS */}
                            <div className="form-group full-width">
                                <label style={{marginBottom:10,display:'block'}}>Respaldo UPS</label>
                                <div style={{display:'flex',gap:12}}>
                                    <label className={`ups-toggle-option ${tieneUPS ? 'active' : ''}`} onClick={() => setTieneUPS(true)}>
                                        <span className="ups-toggle-icon"><Ico.UPS /></span>
                                        <div>
                                            <strong>Con UPS</strong>
                                            <p>El cruce tiene batería de respaldo</p>
                                        </div>
                                        <input type="radio" checked={tieneUPS} onChange={() => setTieneUPS(true)} style={{display:'none'}} />
                                    </label>
                                    <label className={`ups-toggle-option ${!tieneUPS ? 'active' : ''}`} onClick={() => setTieneUPS(false)}>
                                        <span className="ups-toggle-icon"><Ico.NoUPS /></span>
                                        <div>
                                            <strong>Sin UPS</strong>
                                            <p>Sin batería de respaldo</p>
                                        </div>
                                        <input type="radio" checked={!tieneUPS} onChange={() => setTieneUPS(false)} style={{display:'none'}} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {formMessage && <div className="feedback-msg msg-success">{formMessage}</div>}
                        {formError   && <div className="feedback-msg msg-error">{formError}</div>}

                        <div className="form-actions">
                            {isEditing && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancelar</button>}
                            <button type="submit" className="btn btn-primary">
                                {isEditing ? 'Guardar Cambios' : 'Crear Semáforo'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* TABLA */}
            <div className="semaphore-card">
                <h3 className="card-title">Listado de Cruces</h3>
                {loading && <p style={{textAlign:'center',color:'#666',padding:'2rem'}}>Cargando datos...</p>}
                {!loading && error && <div className="feedback-msg msg-error">{error}</div>}
                {!loading && !error && semaphores.length === 0 && <p style={{textAlign:'center',padding:'2rem',color:'#94a3b8'}}>No hay registros.</p>}
                {!loading && !error && semaphores.length > 0 && (
                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>Estado</th>
                                    <th>Cruce</th>
                                    <th>ID</th>
                                    <th>Comuna</th>
                                    <th>UOCT</th>
                                    <th style={{textAlign:'center'}}>UPS</th>
                                    <th style={{textAlign:'center'}}>Opciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {semaphores.map((sem) => {
                                    const { key: stKey } = getOverallStatus(sem.status, sem.monitoreando, sem.enMantencion);
                                    const dotColor = STATUS_COLORS[stKey] || '#6c757d';
                                    return (
                                        <tr key={sem._id}>
                                            <td style={{textAlign:'center'}}>
                                                <span style={{display:'inline-block',width:11,height:11,borderRadius:'50%',background:dotColor,boxShadow:`0 0 5px ${dotColor}80`}} title={stKey} />
                                            </td>
                                            <td style={{fontWeight:600}}>
                                                {sem.cruce}
                                                {sem.enMantencion && (
                                                    <span style={{marginLeft:8,fontSize:'0.68rem',background:'#fef3c7',color:'#92400e',padding:'2px 7px',borderRadius:6,fontWeight:700}}>MANTENCIÓN</span>
                                                )}
                                                {!sem.monitoreando && !sem.enMantencion && (
                                                    <span style={{marginLeft:8,fontSize:'0.68rem',background:'#f1f5f9',color:'#94a3b8',padding:'2px 7px',borderRadius:6,fontWeight:700}}>PAUSADO</span>
                                                )}
                                            </td>
                                            <td>
                                                <span style={{background:'#f1f5f9',padding:'2px 8px',borderRadius:5,fontSize:'0.83rem',fontWeight:600,color:'#475569'}}>{sem.cruceId}</span>
                                            </td>
                                            <td style={{color:'#64748b'}}>{sem.comuna || '—'}</td>
                                            <td style={{color:'#64748b'}}>{sem.UOCT || '—'}</td>
                                            <td style={{textAlign:'center'}}>
                                                <span
                                                    title={sem.tieneUPS !== false ? 'Con UPS instalado' : 'Sin UPS'}
                                                    style={{display:'inline-flex',alignItems:'center',color: sem.tieneUPS !== false ? '#3b82f6' : '#94a3b8'}}
                                                >
                                                    {sem.tieneUPS !== false ? <Ico.UPS /> : <Ico.NoUPS />}
                                                </span>
                                            </td>
                                            <td style={{textAlign:'center'}}>
                                                <button
                                                    className="row-menu-trigger"
                                                    onClick={() => setOptionsTarget(sem)}
                                                    title="Ver opciones"
                                                >
                                                    <Ico.Options />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal opciones centrado */}
            {optionsTarget && (
                <OptionsModal
                    sem={optionsTarget}
                    isAdmin={isAdmin}
                    onClose={() => setOptionsTarget(null)}
                    onHistorial={() => setHistoryTarget(optionsTarget)}
                    onMantención={() => handleToggleMaintenance(optionsTarget)}
                    onActivar={() => handleToggleStatus(optionsTarget)}
                    onEditar={() => handleEdit(optionsTarget)}
                    onBorrar={() => handleDelete(optionsTarget._id, optionsTarget.cruce)}
                    onToggleUPS={handleToggleUPS}
                />
            )}

            {/* Modal historial */}
            {historyTarget && <HistoryModal sem={historyTarget} onClose={() => setHistoryTarget(null)} />}

            {/* Modal mantención */}
            {maintenanceTarget && (
                <div className="sem-modal-backdrop">
                    <div className="sem-modal-panel" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}>
                        <div className="sem-modal-header">
                            <div>
                                <h3 className="sem-modal-title">Iniciar Mantención</h3>
                                <p className="sem-modal-subtitle">{maintenanceTarget.cruce} · {maintenanceTarget.cruceId}</p>
                            </div>
                            <button className="sem-modal-close" onClick={() => setMaintenanceTarget(null)}><Ico.Close /></button>
                        </div>
                        <div style={{padding:'1rem 1.5rem 1.5rem'}}>
                            <label style={{fontSize:'0.82rem',fontWeight:600,color:'#475569',display:'block',marginBottom:6}}>Motivo (opcional)</label>
                            <input className="form-input" type="text" placeholder="Ej: Reemplazo de controlador..."
                                value={maintenanceMotivo} onChange={e=>setMaintenanceMotivo(e.target.value)}
                                style={{marginBottom:'1.25rem'}} />
                            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                                <button className="btn btn-secondary" onClick={() => setMaintenanceTarget(null)}>Cancelar</button>
                                <button className="btn btn-primary" onClick={confirmMaintenance}>Confirmar Mantención</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SemaphorePage;
