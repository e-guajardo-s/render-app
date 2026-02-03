// En: frontend/src/pages/CalendarPage.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { 
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
    addDays, isSameMonth, isSameDay, addMonths, subMonths 
} from 'date-fns';
import { es } from 'date-fns/locale'; 
import './CalendarPage.css';

function CalendarPage() {
    const { user } = useAuth();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [semaphores, setSemaphores] = useState([]); 
    const [technicians, setTechnicians] = useState([]); // <--- ESTADO NUEVO

    // Modales
    const [selectedDate, setSelectedDate] = useState(null);
    const [showEventListModal, setShowEventListModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showAutoModal, setShowAutoModal] = useState(false);
    const [showBatchesModal, setShowBatchesModal] = useState(false);
    
    const [batches, setBatches] = useState([]);
    
    // ESTADO NUEVO EVENTO (Actualizado)
    const [newEvent, setNewEvent] = useState({ 
        title: '', 
        description: '', 
        semaphore: '', 
        type: 'preventivo', 
        date: '',
        technicians: [] // Array de IDs
    });
    
    const [autoConfig, setAutoConfig] = useState({ semaphore: '', freq: 1, start: '' });

    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    const canComplete = user.role === 'user' || isAdmin;

    useEffect(() => {
        fetchEvents();
        if (isAdmin) {
            fetchSemaphores();
            fetchTechnicians(); // <--- Cargar técnicos
        }
    }, [user]);

    const fetchEvents = async () => {
        try {
            const res = await api.get('/api/events');
            const eventsWithDate = res.data.map(e => ({ ...e, date: new Date(e.date) }));
            setEvents(eventsWithDate);
        } catch (error) { console.error("Error events"); }
    };

    const fetchSemaphores = async () => {
        try { const res = await api.get('/api/semaphores'); setSemaphores(res.data); } catch (e) {}
    };

    // --- NUEVO: Cargar técnicos ---
    const fetchTechnicians = async () => {
        try { const res = await api.get('/api/events/technicians'); setTechnicians(res.data); } catch (e) {}
    };

    const fetchBatches = async () => {
        try { const res = await api.get('/api/events/batches'); setBatches(res.data); } catch (error) { console.error("Error lotes"); }
    };

    const handleDeleteBatch = async (batchId) => {
        if(!window.confirm("¿Eliminar TODOS los eventos de esta programación automática?")) return;
        try {
            await api.delete(`/api/events/batch/${batchId}`);
            fetchBatches(); fetchEvents(); 
        } catch (error) { alert("Error al eliminar"); }
    };

    const openAutoMenu = () => { fetchBatches(); setShowBatchesModal(true); };

    const openCreateModal = () => {
        const initialDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
        // Reset form
        setNewEvent({ title: '', description: '', semaphore: '', type: 'preventivo', date: initialDate, technicians: [] });
        setShowCreateModal(true);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newEvent.semaphore || !newEvent.title || !newEvent.date) return alert("Faltan datos obligatorios");
        try {
            const dateToSend = new Date(newEvent.date + 'T12:00:00');
            await api.post('/api/events', { 
                title: newEvent.title, 
                description: newEvent.description,
                semaphore: newEvent.semaphore, 
                type: newEvent.type, 
                date: dateToSend,
                technicians: newEvent.technicians // Enviar array
            });
            setShowCreateModal(false); 
            fetchEvents();
        } catch (e) { alert("Error al crear evento"); }
    };

    const handleAutoGenerate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/events/generate', {
                semaphoreId: autoConfig.semaphore, frequencyMonths: autoConfig.freq, startDate: autoConfig.start || new Date()
            });
            setShowAutoModal(false); fetchEvents(); alert("Eventos generados");
        } catch (e) { alert("Error"); }
    };

    const handleComplete = async (eventId) => {
        if(!window.confirm("¿Marcar como completado?")) return;
        const notes = prompt("Notas del técnico (Opcional):");
        try {
            await api.put(`/api/events/${eventId}/complete`, { notes });
            fetchEvents(); setShowEventListModal(false); 
        } catch (e) { alert("Error"); }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar este evento?")) return;
        try {
            await api.delete(`/api/events/${eventId}`);
            setEvents(prev => prev.filter(e => e._id !== eventId));
            // Cerrar modal si era el ultimo evento del dia
            const remaining = events.filter(e => isSameDay(e.date, selectedDate) && e._id !== eventId);
            if (remaining.length === 0) setShowEventListModal(false);
        } catch (error) { alert("Error al eliminar el evento"); }
    };

    // --- Renderizado del Grid (Sin Cambios Visuales Mayores) ---
    const renderDaysHeader = () => {
        const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
        return <div className="days-header-row">{days.map(d => <div className="day-col-name" key={d}>{d}</div>)}</div>;
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        const today = new Date();

        const rows = [];
        let days = [];
        let day = startDate;

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                const cloneDay = day;
                const dayEvents = events.filter(e => isSameDay(e.date, day));
                const pendingCount = dayEvents.filter(e => e.status === 'pending').length;
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, today);

                days.push(
                    <div
                        className={`day-cell ${!isCurrentMonth ? "disabled" : ""} ${isToday ? "today" : ""}`}
                        key={day}
                        onClick={() => onDateClick(cloneDay, dayEvents)}
                    >
                        <span className="day-number">{format(day, 'd')}</span>
                        <div className="event-dots-container">
                            {dayEvents.slice(0, 4).map((ev, idx) => (
                                <div key={idx} className={`event-dot ${ev.status}`}></div>
                            ))}
                            {dayEvents.length > 4 && <span className="more-events-badge">+{dayEvents.length - 4}</span>}
                        </div>
                        {dayEvents.length > 0 && isCurrentMonth && (
                            <div className={`cell-summary-badge ${pendingCount > 0 ? 'has-pending' : 'all-done'}`}>
                                {pendingCount > 0 ? `${pendingCount} Pend.` : '✓ Listo'}
                            </div>
                        )}
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(<div className="calendar-week-row" key={day}>{days}</div>);
            days = [];
        }
        return <div className="calendar-body-rows">{rows}</div>;
    };

    const onDateClick = (day, dayEvents) => {
        setSelectedDate(day);
        if (dayEvents.length > 0 || isAdmin) setShowEventListModal(true);
    };

    return (
        <div className="page-content calendar-page">
            
            <div className="page-header">
                <h2 className="page-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:'32px', color:'#ff9900'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    Calendario de Mantenimiento
                </h2>
                <p className="page-subtitle">Planificación preventiva y correctiva de la red de semáforos.</p>
            </div>

            <div className="calendar-card">
                <div className="calendar-nav-header">
                    <div className="month-display">
                        <button className="btn-nav-month" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>{'<'}</button>
                        <span className="month-label">{format(currentMonth, 'MMMM yyyy', { locale: es })}</span>
                        <button className="btn-nav-month" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>{'>'}</button>
                    </div>
                    {isAdmin && (
                        <div className="calendar-actions">
                            <button className="btn-calendar-action btn-create" onClick={openCreateModal}>+ Evento</button>
                            <button className="btn-calendar-action btn-auto" onClick={openAutoMenu}>⚙️ Automático</button>
                        </div>
                    )}
                </div>
                <div className="calendar-grid">
                    {renderDaysHeader()}
                    {renderCells()}
                </div>
            </div>

            {/* --- MODAL DETALLE DE EVENTOS --- */}
            {showEventListModal && selectedDate && (
                <div className="modal-backdrop" onClick={() => setShowEventListModal(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <h3 className="modal-title">{format(selectedDate, 'EEEE d MMMM', { locale: es })}</h3>
                        
                        <div className="event-list-scroll">
                            {events.filter(e => isSameDay(e.date, selectedDate)).length === 0 ? (
                                <p style={{textAlign:'center', color:'#64748b'}}>No hay eventos.</p>
                            ) : (
                                events.filter(e => isSameDay(e.date, selectedDate)).map(ev => (
                                    <div key={ev._id} className={`event-card-item ${ev.status}`}>
                                        <div className="event-card-header">
                                            <span className="event-title">{ev.title}</span>
                                            <span className={`status-pill ${ev.status}`}>{ev.status === 'pending' ? 'Pendiente' : 'Listo'}</span>
                                        </div>
                                        <div className="event-details">
                                            <p><strong>Cruce:</strong> {ev.semaphore?.cruce}</p>
                                            
                                            {/* MOSTRAR DESCRIPCIÓN */}
                                            {ev.description && <p style={{margin:'5px 0', color:'#555'}}>{ev.description}</p>}
                                            
                                            {/* MOSTRAR TÉCNICOS ASIGNADOS */}
                                            <p><strong>Asignado a:</strong> {ev.technicians && ev.technicians.length > 0 
                                                ? ev.technicians.map(t => t.username).join(', ') 
                                                : <span style={{color:'#999'}}>Sin asignar</span>}
                                            </p>

                                            {ev.status === 'completed' && <div className="event-notes">Resolución: "{ev.notes}"</div>}
                                        </div>
                                        <div style={{marginTop:'10px', display:'flex', gap:'5px'}}>
                                            {ev.status === 'pending' && canComplete && (
                                                <button className="btn-complete" onClick={() => handleComplete(ev._id)}>✓ Completar</button>
                                            )}
                                            {isAdmin && (
                                                <button className="btn-delete-event" onClick={() => handleDeleteEvent(ev._id)}>Eliminar</button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        {isAdmin && (
                            <button className="btn-create" style={{marginTop:'10px', width:'100%'}} onClick={() => { setShowEventListModal(false); openCreateModal(); }}>
                                + Agregar Evento Aquí
                            </button>
                        )}
                        <button className="modal-close-btn" onClick={() => setShowEventListModal(false)}>Cerrar</button>
                    </div>
                </div>
            )}

            {/* --- MODAL CREAR --- */}
            {showCreateModal && (
                <div className="modal-backdrop">
                    <div className="modal-container">
                        <h3 className="modal-title">Nuevo Evento</h3>
                        <form onSubmit={handleCreate} className="modal-form">
                            {/* SEMÁFORO */}
                            <div>
                                <label className="form-label">Semáforo</label>
                                <select className="form-select" onChange={e => setNewEvent({...newEvent, semaphore: e.target.value})} required value={newEvent.semaphore}>
                                    <option value="">Seleccione...</option>
                                    {semaphores.map(s => <option key={s._id} value={s._id}>{s.cruceId} - {s.cruce}</option>)}
                                </select>
                            </div>
                            
                            {/* FECHA Y TIPO */}
                            <div style={{display:'flex', gap:'10px'}}>
                                <div style={{flex:1}}>
                                    <label className="form-label">Fecha</label>
                                    <input type="date" className="form-input" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required />
                                </div>
                                <div style={{flex:1}}>
                                    <label className="form-label">Tipo</label>
                                    <select className="form-select" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}>
                                        <option value="preventivo">Preventivo</option>
                                        <option value="correctivo">Correctivo</option>
                                    </select>
                                </div>
                            </div>

                            {/* TÉCNICOS (MULTIPLE) */}
                            <div>
                                <label className="form-label">Técnicos Asignados (Ctrl+Click para varios)</label>
                                <select 
                                    className="form-select" 
                                    multiple 
                                    style={{height:'80px'}}
                                    onChange={e => {
                                        const selected = Array.from(e.target.selectedOptions, option => option.value);
                                        setNewEvent({...newEvent, technicians: selected});
                                    }}
                                    value={newEvent.technicians}
                                >
                                    {technicians.map(t => (
                                        <option key={t._id} value={t._id}>{t.username}</option>
                                    ))}
                                </select>
                            </div>

                            {/* TÍTULO */}
                            <div>
                                <label className="form-label">Título</label>
                                <input type="text" className="form-input" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required placeholder="Ej: Revisión semestral"/>
                            </div>

                            {/* DESCRIPCIÓN */}
                            <div>
                                <label className="form-label">Descripción Detallada</label>
                                <textarea 
                                    className="form-textarea" 
                                    rows="3"
                                    value={newEvent.description}
                                    onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                                    placeholder="Instrucciones para el técnico..."
                                />
                            </div>

                            <div className="modal-form-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save">Guardar Evento</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- MODAL BATCHES Y AUTO (Igual que antes) --- */}
            {showBatchesModal && (
                <div className="modal-backdrop" onClick={() => setShowBatchesModal(false)}>
                    <div className="modal-container wide-modal" onClick={e => e.stopPropagation()}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}>
                            <h3 className="modal-title">Programaciones Automáticas</h3>
                            <button className="btn-auto btn-calendar-action" onClick={() => { setShowBatchesModal(false); setShowAutoModal(true); }}>+ Nueva</button>
                        </div>
                        <div className="batches-container">
                            {batches.length === 0 ? <p style={{textAlign:'center', color:'#94a3b8'}}>No hay programaciones.</p> : (
                                <table className="batches-table">
                                    <thead><tr><th>Semáforo</th><th>Fecha</th><th>Cant.</th><th>Acción</th></tr></thead>
                                    <tbody>
                                        {batches.map(batch => (
                                            <tr key={batch._id}>
                                                <td>{batch.semaphoreId?.cruce || 'Desc.'}</td>
                                                <td>{format(new Date(batch.createdAt), 'dd/MM/yyyy')}</td>
                                                <td>{batch.count}</td>
                                                <td><button className="btn-delete-batch" onClick={() => handleDeleteBatch(batch._id)}>Borrar</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        <button className="modal-close-btn" onClick={() => setShowBatchesModal(false)}>Cerrar</button>
                    </div>
                </div>
            )}

            {showAutoModal && (
                <div className="modal-backdrop">
                    <div className="modal-container">
                        <h3 className="modal-title">Generar Plan Anual</h3>
                        <form onSubmit={handleAutoGenerate} className="modal-form">
                            <div>
                                <label className="form-label">Semáforo</label>
                                <select className="form-select" onChange={e => setAutoConfig({...autoConfig, semaphore: e.target.value})} required>
                                    <option value="">Seleccione...</option>
                                    {semaphores.map(s => <option key={s._id} value={s._id}>{s.cruce}</option>)}
                                </select>
                            </div>
                            <div style={{display:'flex', gap:'10px'}}>
                                <div style={{flex:1}}>
                                    <label className="form-label">Frecuencia</label>
                                    <select className="form-select" onChange={e => setAutoConfig({...autoConfig, freq: e.target.value})}>
                                        <option value="1">Mensual</option>
                                        <option value="3">Trimestral</option>
                                        <option value="6">Semestral</option>
                                    </select>
                                </div>
                                <div style={{flex:1}}>
                                    <label className="form-label">Inicio</label>
                                    <input type="date" className="form-input" onChange={e => setAutoConfig({...autoConfig, start: e.target.value})} />
                                </div>
                            </div>
                            <div className="modal-form-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowAutoModal(false)}>Cancelar</button>
                                <button type="submit" className="btn-save">Generar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CalendarPage;