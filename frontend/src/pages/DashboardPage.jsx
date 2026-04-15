// frontend/src/pages/DashboardPage.jsx
import React, { useState, useMemo, useEffect } from 'react'; 
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../context/SocketContext';
import api from '../api'; 
import SantiagoMap from '../components/SantiagoMap';
import MapFilterPanel from '../components/MapFilterPanel';
import { getOverallStatus, STATUS_LEGEND } from '../utils/statusHelper';
import './DashboardPage.css';

// ─── COMPONENTE: AVISOS DEL SISTEMA (MANTENCIONES, ALERTAS) ───────────
const NOTICE_STYLES = {
    info:        { border: '#3b82f6', bg: '#eff6ff', icon: '#3b82f6', label: 'Informativo' },
    warning:     { border: '#f59e0b', bg: '#fffbeb', icon: '#f59e0b', label: 'Advertencia' },
    maintenance: { border: '#7c3aed', bg: '#f5f3ff', icon: '#7c3aed', label: 'Mantención'  },
    success:     { border: '#22c55e', bg: '#f0fdf4', icon: '#22c55e', label: 'Éxito'       },
};

function NoticeBanner({ notices, onDismiss }) {
    if (!notices || notices.length === 0) return null;
    return (
        <div style={{
            position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, width: '90%', maxWidth: '600px',
            display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
            {notices.map(n => {
                const s = NOTICE_STYLES[n.type] || NOTICE_STYLES.info;
                return (
                    <div key={n._id} style={{
                        background: s.bg, border: `1px solid ${s.border}40`, borderLeft: `5px solid ${s.border}`,
                        borderRadius: '8px', padding: '12px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={s.icon} strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0,marginTop:2}}>
                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                        </svg>
                        <div style={{flex:1}}>
                            <p style={{margin:0,fontWeight:700,fontSize:'0.9rem',color:'#0f172a'}}>{n.title}</p>
                            <p style={{margin:'4px 0 0',fontSize:'0.85rem',color:'#475569',lineHeight:1.4}}>{n.message}</p>
                        </div>
                        <button onClick={() => onDismiss(n._id)} style={{
                            background:'none',border:'none',cursor:'pointer',color:'#64748b',fontSize:'1.5rem',lineHeight:1,padding:'0 4px',flexShrink:0
                        }}>×</button>
                    </div>
                );
            })}
        </div>
    );
}
// ──────────────────────────────────────────────────────────────────────

// Panel KPI — resumen ejecutivo sobre el mapa
function KpiBar({ summary }) {
    if (!summary) return null;
    const items = [
        { label: 'Operativo',     value: summary.operativo,    color: '#22c55e' },
        { label: 'Respaldo UPS',  value: summary.ups,          color: '#3b82f6' },
        { label: 'Aislado',       value: summary.aislado,      color: '#7c3aed' },
        { label: 'Anomalía',     value: summary.anomalia,     color: '#fd7e14' },
        { label: 'Sin Conexión',  value: summary.offline,      color: '#dc3545' },
        { label: 'Mantención',   value: summary.mantencion,   color: '#f59e0b' },
        { label: 'Sin Monitoreo', value: summary.sinMonitoreo, color: '#6c757d' },
        { label: 'Tickets',       value: summary.openTickets,  color: '#7c3aed' },
    ];
    return (
        <div className="kpi-bar">
            {items.map(item => (
                <div key={item.label} className="kpi-item">
                    <span className="kpi-dot" style={{background: item.color}} />
                    <span className="kpi-value" style={{color: item.color}}>{item.value ?? '—'}</span>
                    <span className="kpi-label">{item.label}</span>
                </div>
            ))}
            {summary.topFallas?.length > 0 && (
                <div className="kpi-divider" />
            )}
            {summary.topFallas?.slice(0,3).map(f => (
                <div key={f.cruceId} className="kpi-falla-item" title={f.cruce}>
                    <span className="kpi-falla-id">{f.cruceId}</span>
                    <span className="kpi-falla-count">{f.count} fallas</span>
                </div>
            ))}
        </div>
    );
}

const ChevronLeftIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg> );
const ChevronRightIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg> );

const POSITION_SANTIAGO = [-33.4489, -70.6693];
const INITIAL_ZOOM = 12;
const PANEL_WIDTH = 280;

const initialFilterState = STATUS_LEGEND.reduce((acc, status) => { acc[status.key] = true; return acc; }, {});

function DashboardPage() {
    const { onMapReady } = useOutletContext();
    const queryClient = useQueryClient();

    // --- ESTADO UI ---
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState(initialFilterState);
    const [selectedComuna, setSelectedComuna] = useState('');
    const [showOnlyTickets, setShowOnlyTickets] = useState(false);
    const [summary, setSummary] = useState(null);
    const [dismissedNotices, setDismissedNotices] = useState(new Set()); // Estado para cerrar avisos

    // --- REACT QUERY: CARGA DE DATOS ---
    
    // 1. Obtener Avisos Activos del Sistema
    const { data: noticesData = [] } = useQuery({
        queryKey: ['activeNotices'],
        queryFn: async () => {
            const res = await api.get('/api/notices/active');
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // 5 min
    });

    // 2. Obtener Semáforos
    const { data: semaphoresData = [], isLoading: loadingSem, isError: errorSem } = useQuery({
        queryKey: ['semaphores'],
        queryFn: async () => {
            const res = await api.get('/api/semaphores');
            return res.data;
        },
        staleTime: 1000 * 60 * 5, 
    });

    // 3. Obtener Tickets Activos
    const { data: ticketsData = [] } = useQuery({
        queryKey: ['tickets'],
        queryFn: async () => {
            const res = await api.get('/api/tickets');
            return res.data;
        },
        staleTime: 1000 * 60 * 5,
    });

    // --- FUSIÓN DE DATOS (MEMOIZED) ---
    const mergedSemaphores = useMemo(() => {
        const activeTicketCruceIds = new Set(
            ticketsData
                .filter(t => t.status !== 'resolved' && t.cruceId)
                .map(t => t.cruceId)
        );

        return semaphoresData.map(sem => ({
            ...sem,
            hasActiveTicket: activeTicketCruceIds.has(sem.cruceId)
        }));
    }, [semaphoresData, ticketsData]);


    // --- SOCKET.IO ---
    const socket = useSocket();
    useEffect(() => {
        if (!socket) return;

        const handleStatusUpdate = (updatedData) => {
            queryClient.setQueryData(['semaphores'], (oldSemaphores) => {
                if (!oldSemaphores) return oldSemaphores;
                return oldSemaphores.map(sem =>
                    sem.cruceId === updatedData.cruceId
                        ? {
                            ...sem,
                            status: updatedData.fullStatus,
                            ...(updatedData.monitoreando !== undefined && { monitoreando: updatedData.monitoreando })
                          }
                        : sem
                );
            });
        };

        socket.on('status_update', handleStatusUpdate);
        return () => socket.off('status_update', handleStatusUpdate);
    }, [socket, queryClient]);

    // Cargar KPIs ejecutivos
    useEffect(() => {
        const loadSummary = () => api.get('/api/semaphores/stats/summary')
            .then(r => setSummary(r.data)).catch(() => {});
        loadSummary();
        const interval = setInterval(loadSummary, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);


    // --- Lógica de Filtros ---
    const comunasDisponibles = useMemo(() => {
        const comunas = mergedSemaphores.map(s => s.comuna).filter(c => c && c.trim() !== '');
        return [...new Set(comunas)].sort();
    }, [mergedSemaphores]);

    const semaphoresByComuna = useMemo(() => {
        if (!selectedComuna) return mergedSemaphores;
        return mergedSemaphores.filter(s => s.comuna?.toLowerCase() === selectedComuna.toLowerCase());
    }, [mergedSemaphores, selectedComuna]);

    const stats = useMemo(() => {
        const counts = { TOTAL: semaphoresByComuna.length, OPERATIVO: 0, UPS: 0, ANOMALIA: 0, AISLADO: 0, OFFLINE: 0, MANTENCION: 0, NO_MONITORADO: 0 };
        for (const sem of semaphoresByComuna) {
            const { key } = getOverallStatus(sem.status, sem.monitoreando, sem.enMantencion);
            if (counts[key] !== undefined) counts[key]++;
        }
        return counts;
    }, [semaphoresByComuna]);

    const filteredSemaphores = useMemo(() => {
        return semaphoresByComuna.filter(sem => {
            const { key } = getOverallStatus(sem.status, sem.monitoreando, sem.enMantencion);
            const matchesStatus = statusFilter[key];
            const matchesTicket = showOnlyTickets ? sem.hasActiveTicket === true : true;
            return matchesStatus && matchesTicket;
        });
    }, [semaphoresByComuna, statusFilter, showOnlyTickets]);

    const handleFilterChange = (key) => setStatusFilter(prev => ({ ...prev, [key]: !prev[key] }));
    const buttonStyle = {
        position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 110,
        transition: 'right 0.3s ease-in-out', right: isPanelOpen ? `${PANEL_WIDTH - 20}px` : '10px'
    };

    // Avisos visibles descartando los que el usuario ya cerró
    const visibleNotices = noticesData.filter(n => !dismissedNotices.has(n._id));
    const handleDismissNotice = (id) => setDismissedNotices(prev => new Set([...prev, id]));

    // --- RENDER ---
    return (
        <div className="dashboard-map-container" style={{ position: 'relative' }}>
            
            <KpiBar summary={summary} />

            {/* Banner Flotante de Avisos */}
            <NoticeBanner notices={visibleNotices} onDismiss={handleDismissNotice} />

            <div className="map-area-overlap">
                {loadingSem ? (
                    <div className="map-loading-overlay">Cargando Mapa...</div>
                ) : (
                    <SantiagoMap
                        center={POSITION_SANTIAGO}
                        zoom={INITIAL_ZOOM}
                        semaphores={filteredSemaphores} 
                        onMapReady={onMapReady} 
                    />
                )}
                 {errorSem && <div className="map-error-overlay">Error cargando datos</div>}
            </div>

            <div className={`map-filter-panel-overlap ${isPanelOpen ? 'open' : 'closed'}`}>
                <MapFilterPanel 
                    stats={stats}
                    filters={statusFilter}
                    onFilterChange={handleFilterChange}
                    comunas={comunasDisponibles}
                    selectedComuna={selectedComuna}
                    onComunaChange={(e) => setSelectedComuna(e.target.value)}
                    showOnlyTickets={showOnlyTickets}
                    onToggleOnlyTickets={() => setShowOnlyTickets(!showOnlyTickets)}
                />
            </div>

            <button className="map-filter-toggle-button-overlap" onClick={() => setIsPanelOpen(!isPanelOpen)} style={buttonStyle}>
                {isPanelOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
        </div>
    );
}

export default DashboardPage;