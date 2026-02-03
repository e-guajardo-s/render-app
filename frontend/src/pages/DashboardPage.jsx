// frontend/src/pages/DashboardPage.jsx
import React, { useState, useMemo, useEffect } from 'react'; 
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query'; // <--- IMPORTANTE
import { io } from 'socket.io-client'; 
import api from '../api'; 
import SantiagoMap from '../components/SantiagoMap';
import MapFilterPanel from '../components/MapFilterPanel';
import { getOverallStatus, STATUS_LEGEND } from '../utils/statusHelper';
import './DashboardPage.css';

// ... (Iconos y constantes se mantienen igual) ...
const ChevronLeftIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg> );
const ChevronRightIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '20px', height: '20px' }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg> );

const POSITION_SANTIAGO = [-33.4489, -70.6693];
const INITIAL_ZOOM = 12;
const PANEL_WIDTH = 280;

const initialFilterState = STATUS_LEGEND.reduce((acc, status) => { acc[status.key] = true; return acc; }, {});

function DashboardPage() {
    const { onMapReady } = useOutletContext();
    const queryClient = useQueryClient(); // Para manipular la caché manualmente con Sockets

    // --- ESTADO UI ---
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState(initialFilterState);
    const [selectedComuna, setSelectedComuna] = useState('');
    const [showOnlyTickets, setShowOnlyTickets] = useState(false);

    // --- REACT QUERY: CARGA DE DATOS ---
    
    // 1. Obtener Semáforos
    const { data: semaphoresData = [], isLoading: loadingSem, isError: errorSem } = useQuery({
        queryKey: ['semaphores'],
        queryFn: async () => {
            const res = await api.get('/api/semaphores');
            return res.data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutos fresca
    });

    // 2. Obtener Tickets Activos
    const { data: ticketsData = [] } = useQuery({
        queryKey: ['tickets'],
        queryFn: async () => {
            const res = await api.get('/api/tickets');
            return res.data;
        },
        refetchInterval: 30000, // Refrescar tickets cada 30 seg
    });

    // --- FUSIÓN DE DATOS (MEMOIZED) ---
    // Combinamos la lista de semáforos con la info de tickets
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


    // --- SOCKET.IO: ACTUALIZACIÓN EN TIEMPO REAL ---
    useEffect(() => {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const socketUrl = baseUrl.replace('/api', ''); 
        
        const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

        socket.on('connect', () => console.log("✅ Socket Conectado (React Query)"));

        // Al recibir actualización, modificamos directamente la caché de React Query
        socket.on('status_update', (updatedData) => {
            queryClient.setQueryData(['semaphores'], (oldSemaphores) => {
                if (!oldSemaphores) return oldSemaphores;
                return oldSemaphores.map(sem => 
                    sem.cruceId === updatedData.cruceId 
                        ? { ...sem, status: updatedData.fullStatus } 
                        : sem
                );
            });
        });

        return () => socket.disconnect();
    }, [queryClient]);


    // --- Lógica de Filtros (Igual que antes) ---
    const comunasDisponibles = useMemo(() => {
        const comunas = mergedSemaphores.map(s => s.comuna).filter(c => c && c.trim() !== '');
        return [...new Set(comunas)].sort();
    }, [mergedSemaphores]);

    const semaphoresByComuna = useMemo(() => {
        if (!selectedComuna) return mergedSemaphores;
        return mergedSemaphores.filter(s => s.comuna?.toLowerCase() === selectedComuna.toLowerCase());
    }, [mergedSemaphores, selectedComuna]);

    const stats = useMemo(() => {
        const counts = { TOTAL: semaphoresByComuna.length, OPERATIVO: 0, ANOMALIA: 0, FALLA: 0, UPS: 0, OFFLINE: 0 };
        for (const sem of semaphoresByComuna) {
            const { key } = getOverallStatus(sem.status);
            if (counts[key] !== undefined) counts[key]++;
        }
        return counts;
    }, [semaphoresByComuna]);

    const filteredSemaphores = useMemo(() => {
        return semaphoresByComuna.filter(sem => {
            const { key } = getOverallStatus(sem.status);
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

    // --- RENDER ---
    return (
        <div className="dashboard-map-container">
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