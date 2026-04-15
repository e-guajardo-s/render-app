// frontend/src/pages/AuditPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { format } from 'date-fns';
import './AuditPage.css';

const ACTION_LABELS = {
    DELETE_TICKET: { text: 'Ticket Eliminado',  color: '#ef4444' },
    DELETE_USER:   { text: 'Usuario Eliminado', color: '#ef4444' },
    CHANGE_ROLE:   { text: 'Rol Cambiado',      color: '#f59e0b' },
    MAINTENANCE_START: { text: 'Mantención Iniciada', color: '#3b82f6' },
    MAINTENANCE_END:   { text: 'Mantención Finalizada', color: '#22c55e' },
};

const ActionBadge = ({ action }) => {
    const cfg = ACTION_LABELS[action] || { text: action, color: '#6c757d' };
    return (
        <span style={{
            background: cfg.color + '20', color: cfg.color,
            border: `1px solid ${cfg.color}40`,
            padding: '2px 10px', borderRadius: '12px',
            fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap'
        }}>
            {cfg.text}
        </span>
    );
};

function AuditPage() {
    const [logs, setLogs]       = useState([]);
    const [total, setTotal]     = useState(0);
    const [pages, setPages]     = useState(1);
    const [loading, setLoading] = useState(false);

    const [filters, setFilters] = useState({ user: '', action: '', startDate: '', endDate: '' });
    const [page, setPage]       = useState(1);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, limit: 50 });
            if (filters.user)      params.set('user',      filters.user);
            if (filters.action)    params.set('action',    filters.action);
            if (filters.startDate) params.set('startDate', filters.startDate);
            if (filters.endDate)   params.set('endDate',   filters.endDate);

            const res = await api.get(`/api/audit?${params}`);
            setLogs(res.data.logs);
            setTotal(res.data.total);
            setPages(res.data.pages);
        } catch (e) {
            console.error('Error cargando auditoría', e);
        } finally {
            setLoading(false);
        }
    }, [page, filters]);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    const handleFilter = (e) => {
        e.preventDefault();
        setPage(1);
        fetchLogs();
    };

    const handleReset = () => {
        setFilters({ user: '', action: '', startDate: '', endDate: '' });
        setPage(1);
    };

    return (
        <div className="page-content audit-page">
            <div className="page-header">
                <h2 className="page-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#ff9900" style={{width:32}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
                    </svg>
                    Log de Auditoría
                </h2>
                <p className="page-subtitle">Registro de acciones críticas realizadas en el sistema.</p>
            </div>

            {/* Filtros */}
            <div className="audit-filters-card">
                <form className="audit-filters-form" onSubmit={handleFilter}>
                    <input
                        className="audit-input" type="text" placeholder="Usuario..."
                        value={filters.user} onChange={e => setFilters(p => ({...p, user: e.target.value}))}
                    />
                    <select
                        className="audit-input"
                        value={filters.action} onChange={e => setFilters(p => ({...p, action: e.target.value}))}
                    >
                        <option value="">Todas las acciones</option>
                        {Object.entries(ACTION_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v.text}</option>
                        ))}
                    </select>
                    <input className="audit-input" type="date" value={filters.startDate}
                        onChange={e => setFilters(p => ({...p, startDate: e.target.value}))} />
                    <input className="audit-input" type="date" value={filters.endDate}
                        onChange={e => setFilters(p => ({...p, endDate: e.target.value}))} />
                    <button type="submit" className="audit-btn audit-btn-primary">Filtrar</button>
                    <button type="button" className="audit-btn audit-btn-ghost" onClick={handleReset}>Limpiar</button>
                </form>
                <div className="audit-count">{total} registros</div>
            </div>

            {/* Tabla */}
            <div className="audit-table-card">
                {loading ? (
                    <p style={{textAlign:'center',padding:'2rem',color:'#64748b'}}>Cargando...</p>
                ) : logs.length === 0 ? (
                    <p style={{textAlign:'center',padding:'2rem',color:'#94a3b8'}}>Sin registros para los filtros aplicados.</p>
                ) : (
                    <div className="audit-table-wrap">
                        <table className="audit-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Usuario</th>
                                    <th>Acción</th>
                                    <th>Objetivo</th>
                                    <th>Detalle</th>
                                    <th>IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log._id}>
                                        <td style={{fontFamily:'monospace',fontSize:'0.8rem',color:'#64748b',whiteSpace:'nowrap'}}>
                                            {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss')}
                                        </td>
                                        <td style={{fontWeight:600}}>{log.username}</td>
                                        <td><ActionBadge action={log.action} /></td>
                                        <td style={{color:'#334155'}}>{log.target || '—'}</td>
                                        <td style={{fontSize:'0.8rem',color:'#64748b'}}>
                                            {log.meta ? (
                                                log.meta.from && log.meta.to
                                                    ? `${log.meta.from} → ${log.meta.to}`
                                                    : JSON.stringify(log.meta)
                                            ) : '—'}
                                        </td>
                                        <td style={{fontFamily:'monospace',fontSize:'0.75rem',color:'#94a3b8'}}>{log.ip || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Paginación */}
                {pages > 1 && (
                    <div className="audit-pagination">
                        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="audit-btn audit-btn-ghost">← Anterior</button>
                        <span>Página {page} de {pages}</span>
                        <button disabled={page >= pages} onClick={() => setPage(p => p + 1)} className="audit-btn audit-btn-ghost">Siguiente →</button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AuditPage;
