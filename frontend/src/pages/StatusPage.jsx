// frontend/src/pages/StatusPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getOverallStatus, STATUS_COLORS } from '../utils/statusHelper';
import './StatusPage.css';

ChartJS.register(ArcElement, Tooltip, Legend);

// ─── Iconos ───────────────────────────────────────────────────────────────────
const Ico = {
    Signal:   () => <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ff9900" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    Search:   () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    Download: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    Calendar: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    Trash:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
    Refresh:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>,
    Tools:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
    Filter:   () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
    Close:    () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    Excel:    () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    History:  () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    ChevronR: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
    PBI:      () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 17V9"/><path d="M12 17V7"/><path d="M17 17v-4"/></svg>,
};

// ─── Mapa de estados ──────────────────────────────────────────────────────────
const STATUS_META = [
    { key: 'OPERATIVO',     label: 'Operativo',      color: '#22c55e', bg: '#f0fdf4', text: '#166534' },
    { key: 'AISLADO',       label: 'Aislado',         color: '#7c3aed', bg: '#f5f3ff', text: '#4c1d95' },
    { key: 'UPS',           label: 'Respaldo UPS',   color: '#3b82f6', bg: '#eff6ff', text: '#1e40af' },
    { key: 'ANOMALIA',      label: 'Anomalía',        color: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
    { key: 'OFFLINE',       label: 'Sin Conexión',   color: '#ef4444', bg: '#fef2f2', text: '#991b1b' },
    { key: 'MANTENCION',    label: 'Mantención',     color: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
    { key: 'NO_MONITORADO', label: 'Sin Monitoreo',  color: '#94a3b8', bg: '#f8fafc', text: '#475569' },
];

function StatusPage() {
    const { user } = useAuth();
    const normalizedRole = (user?.role || '').toLowerCase();
    const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin';

    const [logs, setLogs]         = useState([]);
    const [devices, setDevices]   = useState([]);
    const [loading, setLoading]   = useState(true);
    const [stats, setStats]       = useState({ errors: 0, warnings: 0, ups: 0, offline: 0, info: 0, total: 0 });

    // Filtros
    const [searchTerm, setSearchTerm]       = useState('');
    const [filterStatus, setFilterStatus]   = useState('all');
    const [filterLog, setFilterLog]         = useState('all');

    // Modales
    const [historyDevice, setHistoryDevice] = useState(null);
    const [showTools, setShowTools]         = useState(false);
    const [showDateModal, setShowDateModal] = useState(false);
    const [dateRange, setDateRange]         = useState({ start: '', end: '' });
    const [modalAction, setModalAction]     = useState('export');
    const [downloading, setDownloading]     = useState(false);

    const socket = useSocket();

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (!socket) return;
        const handleUpdate = (data) => {
            setDevices(prev => prev.map(d =>
                d.cruceId === data.cruceId
                    ? { ...d, status: data.fullStatus, ...(data.monitoreando !== undefined && { monitoreando: data.monitoreando }) }
                    : d
            ));
        };
        socket.on('status_update', handleUpdate);
        return () => socket.off('status_update', handleUpdate);
    }, [socket]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resDevices, resLogs, resStats] = await Promise.all([
                api.get('/api/semaphores'),
                api.get('/api/statuslog'),
                api.get('/api/statuslog/stats')
            ]);
            const sorted = [...resDevices.data].sort((a, b) => {
                const nA = parseInt(a.cruceId, 10), nB = parseInt(b.cruceId, 10);
                if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
                return String(a.cruceId).localeCompare(String(b.cruceId), undefined, { numeric: true });
            });
            setDevices(sorted);
            setLogs(resLogs.data);
            if (resStats.data) setStats(resStats.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // Conteo de estados en tiempo real desde devices
    const statusCounts = useMemo(() => {
        const counts = {};
        STATUS_META.forEach(s => { counts[s.key] = 0; });
        devices.forEach(d => {
            const { key } = getOverallStatus(d.status, d.monitoreando, d.enMantencion);
            if (counts[key] !== undefined) counts[key]++;
        });
        return counts;
    }, [devices]);

    // Dispositivos filtrados
    const filteredDevices = useMemo(() => {
        return devices.filter(d => {
            const matchSearch = !searchTerm ||
                d.cruceId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.cruce?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                d.comuna?.toLowerCase().includes(searchTerm.toLowerCase());
            const { key } = getOverallStatus(d.status, d.monitoreando, d.enMantencion);
            const matchStatus = filterStatus === 'all' || key === filterStatus;
            return matchSearch && matchStatus;
        });
    }, [devices, searchTerm, filterStatus]);

    // Logs filtrados
    const filteredLogs = useMemo(() => {
        return logs.filter(l => {
            if (filterLog === 'all') return true;
            if (filterLog === 'error') return l.type === 'error';
            if (filterLog === 'ups')   return l.type === 'ups';
            if (filterLog === 'offline') return l.type === 'offline';
            if (filterLog === 'info')  return l.type === 'info';
            return true;
        }).slice(0, 150);
    }, [logs, filterLog]);

    // Datos gráfico donut
    const chartData = {
        labels: STATUS_META.map(s => s.label),
        datasets: [{
            data: STATUS_META.map(s => statusCounts[s.key] || 0),
            backgroundColor: STATUS_META.map(s => s.color),
            borderWidth: 3,
            borderColor: '#fff',
            hoverOffset: 6,
        }]
    };
    const chartOptions = {
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (ctx) => ` ${ctx.label}: ${ctx.raw} cruces`
                }
            }
        }
    };
    const totalDevices = devices.length;

    // CSV export
    const generateCSV = (dataLogs, filename) => {
        let csv = '\uFEFF';
        csv += 'Fecha;Hora;ID Cruce;Nombre Cruce;Estado;UTC;Luces;Alimentacion;UPS;Mensaje\n';
        dataLogs.forEach(l => {
            const d = new Date(l.timestamp);
            const fecha = d.toLocaleDateString('es-CL');
            const hora  = d.toLocaleTimeString('es-CL');
            const dev   = devices.find(dev => dev.cruceId === l.cruceId);
            const nombre = dev ? dev.cruce : 'Desconocido';
            const estado = { error:'Falla', warning:'Anomalía', ups:'Respaldo UPS', offline:'Sin Conexión' }[l.type] || 'Normal';
            const msg = (l.message || '').replace(/[\r\n;]/g, ' ').replace(/[\u1000-\uFFFF]+/g, '').trim();
            csv += `${fecha};${hora};${l.cruceId};${nombre};${estado};${l.controlador||'-'};${l.luces||'-'};${l.alimentacion||'-'};${l.ups_estado||'Apagado'};${msg}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = filename;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleExportAll   = async () => { try { const r = await api.get('/api/statuslog?limit=all'); generateCSV(r.data, 'reporte_completo.csv'); } catch { alert('Error.'); } };
    const handleExportRange = async () => {
        if (!dateRange.start || !dateRange.end) return;
        setDownloading(true);
        try { const r = await api.get(`/api/statuslog?startDate=${dateRange.start}&endDate=${dateRange.end}`); generateCSV(r.data, 'reporte_rango.csv'); setShowDateModal(false); }
        catch { alert('Error.'); } finally { setDownloading(false); }
    };
    const handleDeleteRange = async () => {
        if (!isAdmin || !dateRange.start || !dateRange.end || !window.confirm('¿ELIMINAR PERMANENTEMENTE estos registros?')) return;
        try { await api.delete(`/api/statuslog?startDate=${dateRange.start}&endDate=${dateRange.end}`); setShowDateModal(false); loadData(); }
        catch { alert('Error.'); }
    };
    const handleDownloadPBI = () => {
        const link = document.createElement('a');
        link.href = '/template_eventos_pbi.pbit'; link.download = 'Plantilla.pbit';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const getLogPill = (log) => {
        const map = {
            offline: <span className="sp-pill sp-pill-gray">Sin Conexión</span>,
            error:   <span className="sp-pill sp-pill-red">Falla</span>,
            ups:     <span className="sp-pill sp-pill-blue">Respaldo UPS</span>,
            warning: <span className="sp-pill sp-pill-amber">Anomalía</span>,
        };
        return map[log.type] || <span className="sp-pill sp-pill-green">Normal</span>;
    };

    return (
        <div className="sp-container">
            {/* ── HEADER ── */}
            <div className="page-header">
                <h2 className="page-title">
                    <Ico.Signal />
                    Estados de Red
                </h2>
                <p className="page-subtitle">Monitoreo en tiempo real · {totalDevices} cruces registrados</p>
            </div>

            {/* ── BARRA DE ACCIONES ── */}
            <div className="sp-toolbar">
                <div className="sp-search-wrap">
                    <span className="sp-search-ico"><Ico.Search /></span>
                    <input
                        className="sp-search"
                        type="text"
                        placeholder="Buscar por ID, nombre o comuna..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="sp-toolbar-right">
                    {/* Filtro estado */}
                    <select className="sp-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="all">Todos los estados</option>
                        {STATUS_META.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>

                    <button className="sp-btn sp-btn-ghost" onClick={loadData} title="Actualizar">
                        <Ico.Refresh /> Actualizar
                    </button>

                    {/* Menú herramientas */}
                    <div style={{position:'relative'}}>
                        <button className="sp-btn sp-btn-dark" onClick={() => setShowTools(o => !o)}>
                            <Ico.Tools /> Herramientas
                        </button>
                        {showTools && (
                            <div className="sp-tools-dropdown" onClick={() => setShowTools(false)}>
                                <button className="sp-tool-item" onClick={handleExportAll}>
                                    <span className="sp-tool-ico green"><Ico.Excel /></span>
                                    <div><strong>Exportar Todo (CSV)</strong><span>Todos los registros disponibles</span></div>
                                </button>
                                <button className="sp-tool-item" onClick={() => { setModalAction('export'); setDateRange({start:'',end:''}); setShowDateModal(true); }}>
                                    <span className="sp-tool-ico blue"><Ico.Calendar /></span>
                                    <div><strong>Exportar por Rango</strong><span>Seleccionar fechas</span></div>
                                </button>
                                <button className="sp-tool-item" onClick={handleDownloadPBI}>
                                    <span className="sp-tool-ico orange"><Ico.PBI /></span>
                                    <div><strong>Plantilla Power BI</strong><span>Descargar template .pbit</span></div>
                                </button>
                                {isAdmin && <>
                                    <div className="sp-tool-divider" />
                                    <button className="sp-tool-item danger" onClick={() => { setModalAction('delete'); setDateRange({start:'',end:''}); setShowDateModal(true); }}>
                                        <span className="sp-tool-ico red"><Ico.Trash /></span>
                                        <div><strong>Limpiar Registros</strong><span>Eliminar rango de fechas</span></div>
                                    </button>
                                </>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── DASHBOARD: DONUT + KPI ── */}
            <div className="sp-analytics">

                {/* Gráfico donut grande */}
                <div className="sp-donut-card">
                    <h3 className="sp-section-title">Distribución de Estados</h3>
                    <div className="sp-donut-wrap">
                        <div className="sp-donut-chart">
                            {!loading && <Doughnut data={chartData} options={chartOptions} />}
                            <div className="sp-donut-center">
                                <span className="sp-donut-total">{totalDevices}</span>
                                <span className="sp-donut-label">cruces</span>
                            </div>
                        </div>
                        <div className="sp-donut-legend">
                            {STATUS_META.map(s => {
                                const count = statusCounts[s.key] || 0;
                                const pct = totalDevices > 0 ? Math.round((count / totalDevices) * 100) : 0;
                                return (
                                    <button
                                        key={s.key}
                                        className={`sp-legend-item ${filterStatus === s.key ? 'active' : ''}`}
                                        onClick={() => setFilterStatus(prev => prev === s.key ? 'all' : s.key)}
                                    >
                                        <span className="sp-legend-dot" style={{background: s.color}} />
                                        <span className="sp-legend-label">{s.label}</span>
                                        <span className="sp-legend-count" style={{color: s.color}}>{count}</span>
                                        <span className="sp-legend-pct">{pct}%</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* KPI eventos (últimas 24h) */}
                <div className="sp-kpi-col">
                    <h3 className="sp-section-title">Eventos últimas 24h</h3>
                    <div className="sp-kpi-grid">
                        {[
                            { label: 'Fallas Críticas',  value: stats.errors,   color: '#ef4444', bg: '#fef2f2' },
                            { label: 'Anomalías',        value: stats.warnings, color: '#f59e0b', bg: '#fffbeb' },
                            { label: 'Eventos UPS',      value: stats.ups,      color: '#3b82f6', bg: '#eff6ff' },
                            { label: 'Sin Señal',        value: stats.offline,  color: '#94a3b8', bg: '#f8fafc' },
                            { label: 'Normal',           value: stats.info,     color: '#22c55e', bg: '#f0fdf4' },
                            { label: 'Total Eventos',    value: stats.total,    color: '#ff9900', bg: '#fff7ed' },
                        ].map(k => (
                            <div key={k.label} className="sp-kpi-card" style={{borderLeft: `3px solid ${k.color}`, background: k.bg}}>
                                <span className="sp-kpi-value" style={{color: k.color}}>{k.value}</span>
                                <span className="sp-kpi-label">{k.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── GRID DE CRUCES ── */}
            <div className="sp-section">
                <div className="sp-section-header">
                    <h3 className="sp-section-title" style={{margin:0}}>
                        Cruces
                        {filterStatus !== 'all' && (
                            <span className="sp-active-filter">
                                {STATUS_META.find(s => s.key === filterStatus)?.label}
                                <button onClick={() => setFilterStatus('all')}><Ico.Close /></button>
                            </span>
                        )}
                    </h3>
                    <span className="sp-count-badge">{filteredDevices.length} de {totalDevices}</span>
                </div>

                {loading ? (
                    <div className="sp-loading">Cargando datos...</div>
                ) : filteredDevices.length === 0 ? (
                    <div className="sp-empty">Sin cruces para los filtros aplicados</div>
                ) : (
                    <div className="sp-devices-grid">
                        {filteredDevices.map(d => {
                            const { key: stKey, text: stText } = getOverallStatus(d.status, d.monitoreando, d.enMantencion);
                            const meta = STATUS_META.find(s => s.key === stKey) || STATUS_META[6];
                            const lastSeen = d.status?.last_seen ? new Date(d.status.last_seen) : null;
                            const minAgo = lastSeen ? Math.floor((Date.now() - lastSeen.getTime()) / 60000) : null;

                            return (
                                <div
                                    key={d._id}
                                    className="sp-device-card"
                                    style={{'--card-color': meta.color}}
                                    onClick={() => setHistoryDevice(d)}
                                    title="Ver historial"
                                >
                                    <div className="sp-device-top">
                                        <div className="sp-device-dot" style={{background: meta.color, boxShadow: `0 0 8px ${meta.color}80`}} />
                                        <span className="sp-device-id">{d.cruceId}</span>
                                        {d.tieneUPS !== false && (
                                            <span className="sp-device-ups" title="Con UPS">
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="18" height="12" rx="2"/><path d="M23 10v4"/><rect x="3" y="8" width="12" height="8" rx="1" fill="currentColor" opacity="0.2"/><path d="M11.5 9.5L9.5 12h4l-2 2.5" strokeWidth="1.5"/></svg>
                                            </span>
                                        )}
                                    </div>
                                    <p className="sp-device-name">{d.cruce}</p>
                                    <p className="sp-device-comuna">{d.comuna}</p>
                                    <div className="sp-device-footer">
                                        <span className="sp-device-status" style={{background: meta.bg, color: meta.text}}>{stText}</span>
                                        {minAgo !== null && (
                                            <span className="sp-device-time" title="Última señal">
                                                {minAgo < 60 ? `${minAgo}m` : `${Math.floor(minAgo/60)}h`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── TABLA DE EVENTOS ── */}
            <div className="sp-table-card">
                <div className="sp-table-header">
                    <div>
                        <h3 style={{margin:0,fontSize:'1rem',fontWeight:700,color:'#0f172a'}}>Registro de Eventos</h3>
                        <p style={{margin:'2px 0 0',fontSize:'0.75rem',color:'#94a3b8'}}>Últimos {filteredLogs.length} registros</p>
                    </div>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                        <select className="sp-select" value={filterLog} onChange={e => setFilterLog(e.target.value)}>
                            <option value="all">Todos</option>
                            <option value="error">Fallas</option>
                            <option value="ups">UPS</option>
                            <option value="offline">Sin Señal</option>
                            <option value="info">Normal</option>
                        </select>
                        <button className="sp-icon-btn" onClick={loadData} title="Actualizar"><Ico.Refresh /></button>
                    </div>
                </div>
                <div className="sp-table-wrap">
                    <table className="sp-table">
                        <thead>
                            <tr>
                                <th>Fecha / Hora</th>
                                <th>Cruce</th>
                                <th>Estado</th>
                                <th>UTC</th>
                                <th>Luces</th>
                                <th>Energía</th>
                                <th>UPS</th>
                                <th>Mensaje</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log, i) => {
                                const upsOn = (log.ups_estado || 'Apagado').toLowerCase() === 'prendido';
                                const dev = devices.find(d => d.cruceId === log.cruceId);
                                return (
                                    <tr key={log._id || i} className={log.type === 'error' || log.type === 'offline' ? 'sp-row-alert' : ''}>
                                        <td className="sp-td-mono">
                                            <span>{new Date(log.timestamp).toLocaleDateString('es-CL')}</span>
                                            <span style={{color:'#94a3b8',marginLeft:4}}>{new Date(log.timestamp).toLocaleTimeString('es-CL')}</span>
                                        </td>
                                        <td>
                                            <span className="sp-cruce-id">{log.cruceId}</span>
                                            {dev && <span className="sp-cruce-name">{dev.cruce}</span>}
                                        </td>
                                        <td>{getLogPill(log)}</td>
                                        <td><span className={`sp-pill ${log.controlador === 'Prendido' ? 'sp-pill-green' : 'sp-pill-gray'}`}>{log.controlador || '—'}</span></td>
                                        <td><span className={`sp-pill ${log.luces === 'Prendido' ? 'sp-pill-green' : 'sp-pill-gray'}`}>{log.luces || '—'}</span></td>
                                        <td><span className={`sp-pill ${log.alimentacion === 'Prendido' ? 'sp-pill-green' : 'sp-pill-red'}`}>{log.alimentacion || '—'}</span></td>
                                        <td>
                                            {dev?.tieneUPS !== false
                                                ? <span className={`sp-pill ${upsOn ? 'sp-pill-blue' : 'sp-pill-gray'}`}>{upsOn ? 'Activo' : 'Inactivo'}</span>
                                                : <span style={{color:'#cbd5e1',fontSize:'0.75rem'}}>N/A</span>
                                            }
                                        </td>
                                        <td className="sp-td-msg">{log.message || '—'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── MODAL HISTORIAL DE CRUCE ── */}
            {historyDevice && (
                <div className="sp-modal-backdrop" onClick={() => setHistoryDevice(null)}>
                    <div className="sp-modal" style={{maxWidth:640}} onClick={e => e.stopPropagation()}>
                        <div className="sp-modal-header">
                            <div>
                                <h3 className="sp-modal-title">Historial: {historyDevice.cruceId}</h3>
                                <p className="sp-modal-sub">{historyDevice.cruce} · {historyDevice.comuna}</p>
                            </div>
                            <button className="sp-modal-close" onClick={() => setHistoryDevice(null)}><Ico.Close /></button>
                        </div>
                        <div className="sp-modal-body">
                            {(() => {
                                const deviceLogs = logs.filter(l => l.cruceId === historyDevice.cruceId);
                                if (deviceLogs.length === 0) return <p style={{textAlign:'center',color:'#94a3b8',padding:'2rem'}}>Sin registros recientes.</p>;
                                return deviceLogs.map((log, i) => (
                                    <div key={i} className="sp-history-item">
                                        <div className="sp-history-top">
                                            <span className="sp-history-time">{new Date(log.timestamp).toLocaleString('es-CL')}</span>
                                            {getLogPill(log)}
                                        </div>
                                        <p className="sp-history-msg">{log.message}</p>
                                        <div className="sp-history-meta">
                                            UTC: {log.controlador} &nbsp;·&nbsp; Alim: {log.alimentacion} &nbsp;·&nbsp; UPS: {log.ups_estado || 'Apagado'}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* ── MODAL RANGO FECHAS ── */}
            {showDateModal && (
                <div className="sp-modal-backdrop">
                    <div className="sp-modal" style={{maxWidth:420}} onClick={e => e.stopPropagation()}>
                        <div className="sp-modal-header">
                            <div>
                                <h3 className="sp-modal-title">{modalAction === 'export' ? 'Exportar por Rango' : 'Eliminar Registros'}</h3>
                                <p className="sp-modal-sub">Selecciona el período de fechas</p>
                            </div>
                            <button className="sp-modal-close" onClick={() => setShowDateModal(false)}><Ico.Close /></button>
                        </div>
                        <div style={{padding:'1rem 1.5rem 1.5rem'}}>
                            <div style={{display:'flex',gap:12,marginBottom:'1.5rem'}}>
                                <div style={{flex:1}}>
                                    <label className="sp-field-label">Desde</label>
                                    <input type="date" className="sp-field-input" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} />
                                </div>
                                <div style={{flex:1}}>
                                    <label className="sp-field-label">Hasta</label>
                                    <input type="date" className="sp-field-input" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} />
                                </div>
                            </div>
                            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                                <button className="sp-btn sp-btn-ghost" onClick={() => setShowDateModal(false)}>Cancelar</button>
                                <button
                                    className={`sp-btn ${modalAction === 'delete' ? 'sp-btn-danger' : 'sp-btn-dark'}`}
                                    onClick={modalAction === 'export' ? handleExportRange : handleDeleteRange}
                                    disabled={downloading}
                                >
                                    {modalAction === 'export' ? <><Ico.Download /> Descargar</> : <><Ico.Trash /> Eliminar</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StatusPage;
