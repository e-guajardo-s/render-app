// frontend/src/pages/TicketsPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation } from 'react-router-dom';
import api from '../api';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import './TicketsPage.css';

const Icons = {
    Support: () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>,
    Export: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
    Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
    Chat: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>,
    Send: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>,
};

// Modal de comentarios
function CommentsModal({ ticket, onClose, currentUser }) {
    const [comments, setComments] = useState([]);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchComments = useCallback(async () => {
        try {
            const res = await api.get(`/api/tickets/${ticket._id}/comments`);
            setComments(res.data);
        } catch { /* silencioso */ }
    }, [ticket._id]);

    useEffect(() => { fetchComments(); }, [fetchComments]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        setLoading(true);
        try {
            await api.post(`/api/tickets/${ticket._id}/comments`, { text });
            setText('');
            fetchComments();
        } catch { alert('Error enviando comentario'); }
        finally { setLoading(false); }
    };

    const handleDelete = async (commentId) => {
        if (!window.confirm('¿Eliminar comentario?')) return;
        try {
            await api.delete(`/api/tickets/${ticket._id}/comments/${commentId}`);
            fetchComments();
        } catch { alert('Error eliminando'); }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container comments-modal" onClick={e => e.stopPropagation()}>
                <div className="comments-header">
                    <h3 className="modal-title">Comentarios — {ticket.title}</h3>
                    <button className="comments-close" onClick={onClose}>×</button>
                </div>
                <div className="comments-list">
                    {comments.length === 0
                        ? <p style={{color:'#94a3b8',textAlign:'center',padding:'1rem'}}>Sin comentarios aún.</p>
                        : comments.map(c => (
                            <div key={c._id} className="comment-item">
                                <div className="comment-meta">
                                    <strong>{c.username}</strong>
                                    <span>{format(new Date(c.createdAt), 'dd/MM/yyyy HH:mm')}</span>
                                    {(c.username === currentUser?.username || ['admin','superadmin'].includes(currentUser?.role)) && (
                                        <button className="comment-del" onClick={() => handleDelete(c._id)} title="Eliminar"><Icons.Trash /></button>
                                    )}
                                </div>
                                <p className="comment-text">{c.text}</p>
                            </div>
                        ))
                    }
                </div>
                <form className="comment-form" onSubmit={handleSend}>
                    <input
                        className="form-input comment-input"
                        type="text" placeholder="Escribe un comentario de avance..."
                        value={text} onChange={e => setText(e.target.value)}
                        maxLength={1000}
                    />
                    <button type="submit" className="save-btn comment-send-btn" disabled={loading || !text.trim()}>
                        <Icons.Send />
                    </button>
                </form>
            </div>
        </div>
    );
}

function TicketsPage() {
    const { user } = useAuth();
    const location = useLocation();
    const currentUserId  = String(user?.id || user?._id || '').trim();
    const currentUsername = String(user?.username || '').trim().toLowerCase();

    const [tickets, setTickets]           = useState([]);
    const [assignableUsers, setAssignableUsers] = useState([]);
    const [semaphores, setSemaphores]     = useState([]);
    const [highlightCruceId, setHighlightCruceId] = useState(null);

    // Filtros
    const [filterStatus, setFilterStatus]     = useState('all');
    const [filterPriority, setFilterPriority] = useState('all');
    const [filterSearch, setFilterSearch]     = useState('');

    // Asignación masiva
    const [selectedIds, setSelectedIds]   = useState(new Set());
    const [massAssignUser, setMassAssignUser] = useState('');
    const [massAssigning, setMassAssigning]  = useState(false);

    // Comentarios
    const [commentTicket, setCommentTicket] = useState(null);

    // Formulario nuevo ticket
    const [newTitle, setNewTitle]     = useState('');
    const [newDesc, setNewDesc]       = useState('');
    const [newCruceId, setNewCruceId] = useState('');
    const [newPriority, setNewPriority] = useState('Media');
    const [isCreating, setIsCreating] = useState(false);

    // Resolución
    const [showResolveModal, setShowResolveModal] = useState(false);
    const [ticketToResolve, setTicketToResolve]   = useState(null);
    const [resolutionText, setResolutionText]     = useState('');

    useEffect(() => {
        fetchTickets();
        fetchSemaphores();
        if (user.role === 'admin' || user.role === 'superadmin') fetchAssignableUsers();
    }, [user]);

    useEffect(() => {
        if (location.state?.highlightCruceId && tickets.length > 0) {
            const targetId = location.state.highlightCruceId;
            setHighlightCruceId(targetId);
            setTimeout(() => {
                const el = document.getElementById(`ticket-row-${targetId}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
            setTimeout(() => { setHighlightCruceId(null); window.history.replaceState({}, document.title); }, 4000);
        }
    }, [location.state, tickets]);

    const fetchTickets = async () => {
        try { const res = await api.get('/api/tickets'); setTickets(res.data); } catch {}
    };
    const fetchAssignableUsers = async () => {
        try { const res = await api.get('/api/tickets/technicians'); setAssignableUsers(res.data); } catch {}
    };
    const fetchSemaphores = async () => {
        try {
            const res = await api.get('/api/semaphores');
            const sorted = [...res.data].sort((a, b) => {
                const nA = parseInt(a.cruceId,10), nB = parseInt(b.cruceId,10);
                if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
                return String(a.cruceId).localeCompare(String(b.cruceId), undefined, { numeric: true });
            });
            setSemaphores(sorted);
        } catch {}
    };

    // Filtrado de tickets
    const filteredTickets = useMemo(() => {
        return tickets.filter(t => {
            if (filterStatus !== 'all' && t.status !== filterStatus) return false;
            if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
            if (filterSearch) {
                const q = filterSearch.toLowerCase();
                if (!t.title?.toLowerCase().includes(q) &&
                    !t.cruceId?.toLowerCase().includes(q) &&
                    !t.createdBy?.username?.toLowerCase().includes(q)) return false;
            }
            return true;
        });
    }, [tickets, filterStatus, filterPriority, filterSearch]);

    const stats = useMemo(() => ({
        total:       tickets.length,
        pending:     tickets.filter(t => t.status === 'pending').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved:    tickets.filter(t => t.status === 'resolved').length,
    }), [tickets]);

    // Selección masiva
    const toggleSelect = (id) => setSelectedIds(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
    });
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredTickets.length) { setSelectedIds(new Set()); }
        else { setSelectedIds(new Set(filteredTickets.map(t => t._id))); }
    };
    const handleMassAssign = async () => {
        if (!massAssignUser || selectedIds.size === 0) return;
        setMassAssigning(true);
        try {
            await Promise.all([...selectedIds].map(id =>
                api.put(`/api/tickets/${id}/assign`, { technicianId: massAssignUser })
            ));
            setSelectedIds(new Set()); setMassAssignUser('');
            fetchTickets();
        } catch { alert('Error en asignación masiva'); }
        finally { setMassAssigning(false); }
    };

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/tickets', { title: newTitle, description: newDesc, cruceId: newCruceId || null, priority: newPriority });
            setIsCreating(false); setNewTitle(''); setNewDesc(''); setNewCruceId(''); setNewPriority('Media');
            fetchTickets();
        } catch { alert('Error al crear ticket'); }
    };
    const handleAssign = async (ticketId, userId) => {
        if (!userId) return;
        try { await api.put(`/api/tickets/${ticketId}/assign`, { technicianId: userId }); fetchTickets(); } catch { alert('Error al asignar'); }
    };
    const handleDeleteTicket = async (ticketId) => {
        if (window.confirm('¿Eliminar ticket permanentemente?')) {
            try { await api.delete(`/api/tickets/${ticketId}`); fetchTickets(); } catch { alert('Error al eliminar'); }
        }
    };
    const handleAcceptTicket  = async (id) => { try { await api.put(`/api/tickets/${id}/status`, { status: 'in_progress' }); fetchTickets(); } catch {} };
    const openResolveModal     = (id)  => { setTicketToResolve(id); setResolutionText(''); setShowResolveModal(true); };
    const confirmResolution    = async () => {
        if (!resolutionText.trim()) return alert('Ingrese procedimiento.');
        try { await api.put(`/api/tickets/${ticketToResolve}/status`, { status: 'resolved', resolutionNote: resolutionText }); setShowResolveModal(false); fetchTickets(); } catch {}
    };

    const handleExportExcel = () => {
        const ws = XLSX.utils.json_to_sheet(tickets.map(t => ({
            Titulo: t.title, Estado: t.status, Prioridad: t.priority,
            Cruce: t.cruceId || 'General', Solicitante: t.createdBy?.username || 'N/A',
            Asignado_A: t.assignedTo?.username || 'Sin Asignar',
            Fecha_Creacion: format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm'),
            Resolucion: t.resolutionNote || ''
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Tickets');
        XLSX.writeFile(wb, 'Reporte_Tickets.xlsx');
    };

    const getStatusLabel  = s => s === 'pending' ? 'Pendiente' : s === 'in_progress' ? 'En Progreso' : 'Resuelto';
    const getPriorityBadge = p => {
        const cfg = { Critica: 'pill-red', Alta: 'pill-orange', Media: 'pill-blue', Baja: 'pill-green' };
        return <span className={`pill ${cfg[p] || 'pill-gray'}`}>{p || 'Media'}</span>;
    };

    const isAdmin = user.role === 'admin' || user.role === 'superadmin';

    return (
        <div className="page-content tickets-page">
            <div className="page-header">
                <h2 className="page-title"><Icons.Support /> Centro de Soporte</h2>
                <p className="page-subtitle">Gestión de tickets y prioridades de mantenimiento.</p>
            </div>

            {/* Stats */}
            <div className="ticket-stats-bar">
                <div className="stat-box"><span className="stat-label stat-total">Total</span><span className="stat-value">{stats.total}</span></div>
                <div className="stat-box"><span className="stat-label stat-pending">Pendientes</span><span className="stat-value" style={{color:'#ef4444'}}>{stats.pending}</span></div>
                <div className="stat-box"><span className="stat-label stat-progress">En Proceso</span><span className="stat-value" style={{color:'#f59e0b'}}>{stats.in_progress}</span></div>
                <div className="stat-box"><span className="stat-label stat-resolved">Resueltos</span><span className="stat-value" style={{color:'#10b981'}}>{stats.resolved}</span></div>
            </div>

            {/* Filtros */}
            <div className="tickets-filter-bar">
                <input
                    className="tickets-search-input" type="text"
                    placeholder="Buscar por asunto, cruce o usuario..."
                    value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
                />
                <select className="tickets-filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="all">Todos los estados</option>
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="resolved">Resuelto</option>
                </select>
                <select className="tickets-filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                    <option value="all">Todas las prioridades</option>
                    <option value="Critica">Crítica</option>
                    <option value="Alta">Alta</option>
                    <option value="Media">Media</option>
                    <option value="Baja">Baja</option>
                </select>
                <button onClick={handleExportExcel} className="export-btn"><Icons.Export /> Excel</button>
            </div>

            {/* Asignación masiva */}
            {isAdmin && selectedIds.size > 0 && (
                <div className="mass-assign-bar">
                    <span className="mass-assign-count">{selectedIds.size} seleccionados</span>
                    <select className="tickets-filter-select" value={massAssignUser} onChange={e => setMassAssignUser(e.target.value)}>
                        <option value="">Asignar a...</option>
                        {assignableUsers.map(u => <option key={u._id} value={u._id}>{u.username}</option>)}
                    </select>
                    <button className="save-btn" style={{padding:'8px 16px'}} onClick={handleMassAssign} disabled={massAssigning || !massAssignUser}>
                        {massAssigning ? 'Asignando...' : 'Asignar'}
                    </button>
                    <button className="cancel-btn" style={{padding:'8px 16px'}} onClick={() => setSelectedIds(new Set())}>Cancelar</button>
                </div>
            )}

            {/* Formulario nuevo ticket */}
            {(user.role === 'municipalidad' || isAdmin) && (
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
                                        <option value="Baja">Baja</option>
                                        <option value="Media">Media</option>
                                        <option value="Alta">Alta</option>
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

            {/* Tabla */}
            <div className="tickets-card">
                {filteredTickets.length === 0 ? (
                    <p style={{padding:'2rem',textAlign:'center',color:'#94a3b8'}}>
                        {tickets.length === 0 ? 'Sin tickets.' : 'Sin resultados para los filtros aplicados.'}
                    </p>
                ) : (
                    <table className="tickets-table">
                        <thead>
                            <tr>
                                {isAdmin && (
                                    <th style={{width:36}}>
                                        <input type="checkbox"
                                            checked={selectedIds.size === filteredTickets.length && filteredTickets.length > 0}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                )}
                                <th>Estado</th>
                                <th>Prioridad</th>
                                <th style={{width:'28%'}}>Detalle</th>
                                <th>Semáforo</th>
                                <th>Solicitante</th>
                                <th>Asignado a</th>
                                <th>Fechas</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTickets.map(ticket => {
                                const isHighlighted = highlightCruceId && ticket.cruceId === highlightCruceId && ticket.status !== 'resolved';
                                const assignedUserId   = String(ticket?.assignedTo?._id || '').trim();
                                const assignedUsername  = String(ticket?.assignedTo?.username || '').trim().toLowerCase();
                                const isAssignedToMe   = (currentUserId && assignedUserId && currentUserId === assignedUserId) ||
                                                         (currentUsername && assignedUsername && currentUsername === assignedUsername);
                                const isSelected = selectedIds.has(ticket._id);

                                return (
                                    <tr key={ticket._id}
                                        id={ticket.cruceId === highlightCruceId ? `ticket-row-${ticket.cruceId}` : undefined}
                                        className={`${isHighlighted ? 'row-highlight-flash' : ''} ${isSelected ? 'row-selected' : ''}`}
                                    >
                                        {isAdmin && (
                                            <td style={{textAlign:'center'}}>
                                                <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(ticket._id)} />
                                            </td>
                                        )}
                                        <td><span className={`status-badge ${ticket.status}`}>{getStatusLabel(ticket.status)}</span></td>
                                        <td>{getPriorityBadge(ticket.priority)}</td>
                                        <td>
                                            <span className="ticket-title" style={{display:'block',marginBottom:'4px'}}>{ticket.title}</span>
                                            <p className="ticket-desc" style={{margin:'0 auto',maxWidth:'90%'}}>{ticket.description}</p>
                                            {ticket.resolutionNote && (
                                                <div className="ticket-resolution" style={{marginTop:'6px'}}>
                                                    <strong>Solución:</strong> {ticket.resolutionNote}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            {ticket.cruceId
                                                ? <span style={{fontWeight:'600',color:'#3b82f6',background:'#eff6ff',padding:'2px 8px',borderRadius:'12px',fontSize:'0.85rem'}}>ID: {ticket.cruceId}</span>
                                                : <span style={{color:'#94a3b8',fontSize:'0.85rem'}}>- General -</span>}
                                        </td>
                                        <td>{ticket.createdBy?.username || 'N/A'}</td>
                                        <td>{ticket.assignedTo?.username || <span style={{color:'#94a3b8',fontStyle:'italic'}}>Sin Asignar</span>}</td>
                                        <td className="dates-col">
                                            <div>C: {format(new Date(ticket.createdAt), 'dd/MM/yyyy')}</div>
                                            {ticket.resolvedAt && <div>R: {format(new Date(ticket.resolvedAt), 'dd/MM HH:mm')}</div>}
                                            {/* Tiempo de respuesta */}
                                            {ticket.acceptedAt && ticket.status !== 'resolved' && (
                                                <div style={{fontSize:'0.7rem',color:'#f59e0b'}}>
                                                    En progreso: {Math.round((Date.now() - new Date(ticket.acceptedAt)) / 3600000)}h
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className="actions-cell-wrapper">
                                                {/* Comentarios */}
                                                <button
                                                    className="btn-comments" title="Ver comentarios"
                                                    onClick={() => setCommentTicket(ticket)}
                                                >
                                                    <Icons.Chat />
                                                </button>

                                                {isAdmin && ticket.status !== 'resolved' && (
                                                    <select className="assign-select"
                                                        onChange={e => handleAssign(ticket._id, e.target.value)}
                                                        value={ticket.assignedTo?._id || ''}
                                                    >
                                                        <option value="" disabled>Reasignar...</option>
                                                        {assignableUsers.map(u => <option key={u._id} value={u._id}>{u.username}</option>)}
                                                    </select>
                                                )}

                                                {isAssignedToMe && (
                                                    <div className="tech-actions">
                                                        {ticket.status === 'pending'     && <button className="btn-action-small btn-accept"  onClick={() => handleAcceptTicket(ticket._id)}>Aceptar</button>}
                                                        {ticket.status === 'in_progress' && <button className="btn-action-small btn-resolve" onClick={() => openResolveModal(ticket._id)}>Resolver</button>}
                                                    </div>
                                                )}

                                                {isAdmin && (
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

            {/* Modal resolución */}
            {showResolveModal && (
                <div className="modal-backdrop">
                    <div className="modal-container">
                        <h3 className="modal-title">Resolver Ticket</h3>
                        <textarea className="form-textarea resolution-textarea" value={resolutionText} onChange={e => setResolutionText(e.target.value)} placeholder="Procedimiento realizado..." rows={5} />
                        <div className="form-buttons">
                            <button className="cancel-btn" onClick={() => setShowResolveModal(false)}>Cancelar</button>
                            <button className="save-btn" onClick={confirmResolution}>Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal comentarios */}
            {commentTicket && (
                <CommentsModal
                    ticket={commentTicket}
                    currentUser={user}
                    onClose={() => setCommentTicket(null)}
                />
            )}
        </div>
    );
}

export default TicketsPage;
