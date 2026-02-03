// frontend/src/pages/TicketsPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import api from '../api';
import * as XLSX from 'xlsx';
import { format } from 'date-fns'; 
import './TicketsPage.css';

// Definición de Iconos SVG
const Icons = {
    Support: () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>,
    Export: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
    Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
};

function TicketsPage() {
    const { user } = useAuth();
    const location = useLocation();
    
    const [tickets, setTickets] = useState([]);
    const [assignableUsers, setAssignableUsers] = useState([]); 
    const [semaphores, setSemaphores] = useState([]);
    
    const [highlightCruceId, setHighlightCruceId] = useState(null);
    
    // Estados Crear Ticket
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newCruceId, setNewCruceId] = useState('');
    const [newPriority, setNewPriority] = useState('Media'); 
    const [isCreating, setIsCreating] = useState(false);

    // Estados Modal Resolución
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [ticketToResolve, setTicketToResolve] = useState(null);
    const [resolutionText, setResolutionText] = useState('');

    useEffect(() => {
        fetchTickets();
        fetchSemaphores();
        if (user.role === 'admin' || user.role === 'superadmin') {
            fetchAssignableUsers();
        }
    }, [user]);

    // Detectar si venimos del mapa y resaltar
    useEffect(() => {
        if (location.state?.highlightCruceId && tickets.length > 0) {
            const targetId = location.state.highlightCruceId;
            setHighlightCruceId(targetId);

            setTimeout(() => {
                const element = document.getElementById(`ticket-row-${targetId}`);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500);

            setTimeout(() => {
                setHighlightCruceId(null);
                window.history.replaceState({}, document.title);
            }, 4000);
        }
    }, [location.state, tickets]);

    const fetchTickets = async () => { try { const res = await api.get('/api/tickets'); setTickets(res.data); } catch (error) { console.error("Error tickets"); } };
    const fetchAssignableUsers = async () => { try { const res = await api.get('/api/tickets/technicians'); setAssignableUsers(res.data); } catch (error) { console.error("Error usuarios asignables"); } };
    const fetchSemaphores = async () => { try { const res = await api.get('/api/semaphores'); setSemaphores(res.data); } catch (error) { console.error("Error semáforos"); } };

    // --- ACCIONES ---
    const handleCreateTicket = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/tickets', { 
                title: newTitle, description: newDesc, cruceId: newCruceId || null, priority: newPriority 
            });
            setIsCreating(false); setNewTitle(''); setNewDesc(''); setNewCruceId(''); setNewPriority('Media');
            fetchTickets(); alert("Ticket creado exitosamente");
        } catch (error) { alert("Error al crear ticket"); }
    };

    const handleAssign = async (ticketId, userId) => {
        if (!userId) return;
        try { await api.put(`/api/tickets/${ticketId}/assign`, { technicianId: userId }); fetchTickets(); } catch (error) { alert("Error al asignar"); }
    };

    const handleDeleteTicket = async (ticketId) => {
        if (window.confirm("¿Eliminar ticket permanentemente?")) {
            try { await api.delete(`/api/tickets/${ticketId}`); fetchTickets(); } catch (error) { alert("Error al eliminar"); }
        }
    };

    const handleAcceptTicket = async (ticketId) => {
        try { await api.put(`/api/tickets/${ticketId}/status`, { status: 'in_progress' }); fetchTickets(); } catch (error) { alert("Error al aceptar"); }
    };

    const openResolveModal = (ticketId) => { setTicketToResolve(ticketId); setResolutionText(''); setShowResolveModal(true); };

    const confirmResolution = async () => {
        if (!resolutionText.trim()) return alert("Ingrese procedimiento.");
        try {
            await api.put(`/api/tickets/${ticketToResolve}/status`, { status: 'resolved', resolutionNote: resolutionText });
            setShowResolveModal(false); setTicketToResolve(null); fetchTickets();
        } catch (error) { alert("Error al resolver"); }
    };

    const stats = useMemo(() => {
        return {
            total: tickets.length,
            pending: tickets.filter(t => t.status === 'pending').length,
            in_progress: tickets.filter(t => t.status === 'in_progress').length,
            resolved: tickets.filter(t => t.status === 'resolved').length
        };
    }, [tickets]);

    const handleExportExcel = () => { 
        const ws = XLSX.utils.json_to_sheet(tickets.map(t => ({
            ID: t._id,
            Titulo: t.title,
            Estado: t.status,
            Prioridad: t.priority,
            Cruce: t.cruceId || 'General',
            Solicitante: t.createdBy?.username || 'N/A',
            Asignado_A: t.assignedTo?.username || 'Sin Asignar',
            Fecha_Creacion: format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm'),
            Resolucion: t.resolutionNote || ''
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tickets");
        XLSX.writeFile(wb, "Reporte_Tickets.xlsx");
    };

    const getStatusLabel = (s) => (s === 'pending' ? 'Pendiente' : s === 'in_progress' ? 'En Progreso' : 'Resuelto');

    const getPriorityBadge = (p) => {
        const priority = p || 'Media';
        let colorClass = 'pill-gray';
        if (priority === 'Critica') colorClass = 'pill-red';
        else if (priority === 'Alta') colorClass = 'pill-orange'; 
        else if (priority === 'Media') colorClass = 'pill-blue';
        else if (priority === 'Baja') colorClass = 'pill-green';
        return <span className={`pill ${colorClass}`}>{priority}</span>;
    };

    return (
        <div className="page-content tickets-page">
            <div className="page-header">
                <h2 className="page-title"><Icons.Support /> Centro de Soporte</h2>
                <p className="page-subtitle">Gestión de tickets y prioridades de mantenimiento.</p>
            </div>

            <div className="ticket-stats-bar">
                <div className="stat-box"><span className="stat-label stat-total">Total</span><span className="stat-value">{stats.total}</span></div>
                <div className="stat-box"><span className="stat-label stat-pending">Pendientes</span><span className="stat-value" style={{color:'#ef4444'}}>{stats.pending}</span></div>
                <div className="stat-box"><span className="stat-label stat-progress">En Proceso</span><span className="stat-value" style={{color:'#f59e0b'}}>{stats.in_progress}</span></div>
                <div className="stat-box"><span className="stat-label stat-resolved">Resueltos</span><span className="stat-value" style={{color:'#10b981'}}>{stats.resolved}</span></div>
            </div>

            <div className="header-actions">
                <button onClick={handleExportExcel} className="export-btn"><Icons.Export /> Exportar Excel</button>
            </div>

            {(user.role === 'municipalidad' || user.role === 'admin' || user.role === 'superadmin') && (
                <div className="create-ticket-section">
                    {!isCreating ? (
                        <button className="new-ticket-btn" onClick={() => setIsCreating(true)}>+ Nuevo Ticket</button>
                    ) : (
                        <div className="ticket-form-card">
                            <h3 className="form-title">Crear Nuevo Ticket</h3>
                            <form onSubmit={handleCreateTicket} className="ticket-form">
                                <input className="form-input" type="text" placeholder="Asunto..." value={newTitle} onChange={e => setNewTitle(e.target.value)} required />
                                <div style={{display:'flex', gap:'10px'}}>
                                    <select className="form-input" value={newCruceId} onChange={e => setNewCruceId(e.target.value)} style={{flex:2}}>
                                        <option value="">-- Semáforo (Opcional) --</option>
                                        {semaphores.map(s => <option key={s._id} value={s.cruceId}>{s.cruceId} - {s.cruce}</option>)}
                                    </select>
                                    <select className="form-input" value={newPriority} onChange={e => setNewPriority(e.target.value)} style={{flex:1}}>
                                        <option value="Baja">Prioridad Baja</option>
                                        <option value="Media">Prioridad Media</option>
                                        <option value="Alta">Prioridad Alta</option>
                                        <option value="Critica">Crítica (Urgente)</option>
                                    </select>
                                </div>
                                <textarea className="form-textarea" placeholder="Descripción..." value={newDesc} onChange={e => setNewDesc(e.target.value)} required rows={4} />
                                <div className="form-buttons">
                                    <button type="button" className="cancel-btn" onClick={() => setIsCreating(false)}>Cancelar</button>
                                    <button type="submit" className="save-btn">Enviar Ticket</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            )}

            <div className="tickets-card">
                {tickets.length === 0 ? <p style={{padding:'2rem', textAlign:'center', color:'#94a3b8'}}>Sin tickets.</p> : (
                    <table className="tickets-table">
                        <thead>
                            <tr>
                                <th>Estado</th>
                                <th>Prioridad</th>
                                <th style={{width:'30%', textAlign: 'center'}}>Detalle</th>
                                <th>Semáforo</th>
                                <th>Solicitante</th>
                                <th>Asignado a</th>
                                <th>Fechas</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.map(ticket => {
                                const isHighlighted = highlightCruceId && 
                                                      ticket.cruceId === highlightCruceId && 
                                                      ticket.status !== 'resolved';

                                return (
                                    <tr 
                                        key={ticket._id} 
                                        id={ticket.cruceId === highlightCruceId ? `ticket-row-${ticket.cruceId}` : undefined}
                                        className={isHighlighted ? 'row-highlight-flash' : ''}
                                    >
                                        <td><span className={`status-badge ${ticket.status}`}>{getStatusLabel(ticket.status)}</span></td>
                                        <td>{getPriorityBadge(ticket.priority)}</td>
                                        <td style={{textAlign: 'center'}}>
                                            <span className="ticket-title" style={{display: 'block', marginBottom: '4px'}}>{ticket.title}</span>
                                            <p className="ticket-desc" style={{margin: '0 auto', maxWidth: '90%'}}>{ticket.description}</p>
                                            {ticket.resolutionNote && <div className="ticket-resolution" style={{textAlign: 'center', marginTop: '8px'}}><strong>Solución:</strong> {ticket.resolutionNote}</div>}
                                        </td>
                                        <td>
                                            {ticket.cruceId ? (
                                                <span style={{fontWeight:'600', color:'#3b82f6', background:'#eff6ff', padding:'2px 8px', borderRadius:'12px', fontSize:'0.85rem'}}>ID: {ticket.cruceId}</span>
                                            ) : <span style={{color:'#94a3b8', fontSize:'0.85rem'}}>- General -</span>}
                                        </td>
                                        <td>{ticket.createdBy?.username || 'N/A'}</td>
                                        <td>
                                            {ticket.assignedTo?.username || <span style={{color:'#94a3b8', fontStyle:'italic'}}>Sin Asignar</span>}
                                        </td>
                                        <td className="dates-col">
                                            <div>C: {format(new Date(ticket.createdAt), 'dd/MM/yyyy')}</div>
                                            {ticket.resolvedAt && <div>R: {format(new Date(ticket.resolvedAt), 'dd/MM HH:mm')}</div>}
                                        </td>
                                        <td>
                                            <div className="actions-cell-wrapper">
                                                {(user.role === 'admin' || user.role === 'superadmin') && ticket.status !== 'resolved' && (
                                                    <select 
                                                        className="assign-select" 
                                                        onChange={(e) => handleAssign(ticket._id, e.target.value)} 
                                                        value={ticket.assignedTo?._id || ""}
                                                    >
                                                        <option value="" disabled>Reasignar...</option>
                                                        {/* MODIFICACIÓN: SOLO NOMBRE DE USUARIO */}
                                                        {assignableUsers.map(u => (
                                                            <option key={u._id} value={u._id}>
                                                                {u.username}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                                
                                                {(user.id === ticket.assignedTo?._id) && (
                                                    <div className="tech-actions">
                                                        {ticket.status === 'pending' && <button className="btn-action-small btn-accept" onClick={() => handleAcceptTicket(ticket._id)}>Aceptar</button>}
                                                        {ticket.status === 'in_progress' && <button className="btn-action-small btn-resolve" onClick={() => openResolveModal(ticket._id)}>Resolver</button>}
                                                    </div>
                                                )}

                                                {(user.role === 'admin' || user.role === 'superadmin') && (
                                                    <button className="btn-delete-ticket" onClick={() => handleDeleteTicket(ticket._id)} title="Eliminar"><Icons.Trash /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {showResolveModal && (
                <div className="modal-backdrop">
                    <div className="modal-container">
                        <h3 className="modal-title">Resolver Ticket</h3>
                        <textarea className="form-textarea resolution-textarea" value={resolutionText} onChange={(e) => setResolutionText(e.target.value)} placeholder="Procedimiento..." rows={5} />
                        <div className="form-buttons">
                            <button className="cancel-btn" onClick={() => setShowResolveModal(false)}>Cancelar</button>
                            <button className="save-btn" onClick={confirmResolution}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TicketsPage;