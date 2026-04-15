import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import MarkerClusterGroup from './MarkerClusterGroup'; 
import L from 'leaflet';
import SemaphoreInfoWindow from './SemaphoreInfoWindow';
import ReportFailureModal from './ReportFailureModal'; 
import { getOverallStatus, getStatusColor, STATUS_COLORS } from '../utils/statusHelper'; // <-- Añadido STATUS_COLORS
import 'leaflet/dist/leaflet.css';
import './SantiagoMap.css'; 

const CARTODB_POSITRON_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

// --- 1. ICONO PERSONALIZADO (Ahora guarda el statusKey internamente) ---
const createCustomIcon = (statusKey, hasActiveTicket) => {
    const color = getStatusColor(statusKey);
    // Todos los pins usan el mismo estilo base con su color
    const bodyStyle = `background-color: ${color}; box-shadow: 0 0 8px ${color}80;`;
    const ticketBadgeHTML = hasActiveTicket 
        ? `<div class="ticket-badge-indicator" title="Ticket Pendiente">!</div>` 
        : '';

    return L.divIcon({
        className: 'custom-div-icon', 
        html: `
            <div class="semaphore-marker-wrapper">
                <div class="semaphore-marker-body" style="${bodyStyle}">
                    <div class="marker-core"></div>
                </div>
                ${ticketBadgeHTML}
            </div>
        `,
        iconSize: [24, 24],   
        iconAnchor: [12, 12], 
        popupAnchor: [0, -12],
        statusKey: statusKey // <-- TRUCO CLAVE: Guardamos el estado en el objeto del ícono
    });
};

// --- 2. LÓGICA DE JERARQUÍA PARA LOS CLÚSTERES ---
const createClusterCustomIcon = function (cluster) {
    const markers = cluster.getAllChildMarkers();

    // Definimos la jerarquía real de monitoreo (menor número = mayor prioridad)
    const priorityMap = {
        'OFFLINE':       1,
        'ANOMALIA':      2,
        'UPS':           3,
        'AISLADO':       4,
        'OPERATIVO':     5,
        'MANTENCION':    6,
        'NO_MONITORADO': 7,
    };

    let highestPriority = 99;
    let dominantStatus = 'OPERATIVO';

    // Recorremos todos los marcadores dentro de este clúster
    markers.forEach(marker => {
        // Leemos el statusKey que inyectamos al crear el divIcon
        const statusKey = marker.options.icon.options.statusKey || 'OFFLINE';
        
        if (priorityMap[statusKey] < highestPriority) {
            highestPriority = priorityMap[statusKey];
            dominantStatus = statusKey;
        }
    });

    const bgColor = getStatusColor(dominantStatus);
    const count = cluster.getChildCount();

    // Retornamos el ícono circular del clúster con el color predominante
    return L.divIcon({
        html: `<div style="background-color: ${bgColor}e6; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 0 10px ${bgColor}; font-size: 14px;">${count}</div>`,
        className: 'custom-cluster-icon',
        iconSize: L.point(40, 40, true),
    });
};
// --- CONTROLADOR DEL MAPA Y CLUSTERS ---
function MapController({ onMapSet, onMapReady, onMarkerClick, semaphores }) {
    const map = useMap(); 

    useEffect(() => {
        if (map) {
            onMapSet(map); 
            if (onMapReady) onMapReady(map); 
        }
    }, [map, onMapSet, onMapReady]);
    
    const semaphoresWithCoords = semaphores.filter(sem => sem.coordenadas && typeof sem.coordenadas.lat === 'number');
    
    return (
        <MarkerClusterGroup 
            chunkedLoading 
            maxClusterRadius={20} 
            disableClusteringAtZoom={12} // <-- NUEVO: A partir del zoom 12 (vista de ciudad), desarma los clústeres y muestra los pines.
            spiderfyOnMaxZoom={true} 
            iconCreateFunction={createClusterCustomIcon} // <-- NUEVO: Le pasamos nuestra lógica de colores
        >
            {semaphoresWithCoords.map(sem => {
                 const { key: statusKey } = getOverallStatus(sem.status, sem.monitoreando, sem.enMantencion);
                 const hasTicket = sem.hasActiveTicket === true;
                 const icon = createCustomIcon(statusKey, hasTicket);
                 return (
                    <Marker
                        key={sem._id || sem.cruceId}
                        position={[sem.coordenadas.lat, sem.coordenadas.lng]}
                        icon={icon}
                        eventHandlers={{
                            click: (e) => {
                                L.DomEvent.stopPropagation(e);
                                onMarkerClick(sem); 
                            },
                        }}
                    />
                );
            })}
        </MarkerClusterGroup>
    );
}

// --- COMPONENTE PRINCIPAL (Se mantiene la lógica original) ---
function SantiagoMap({ center, zoom, semaphores = [], onMapReady }) { 
    const [mapInstance, setMapInstance] = useState(null); 
    const [selectedSemaphore, setSelectedSemaphore] = useState(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [infoWindowVisible, setInfoWindowVisible] = useState(false);

    const handleMarkerClick = (semaphore) => {
        if (mapInstance && semaphore.coordenadas) {
            mapInstance.setView([semaphore.coordenadas.lat, semaphore.coordenadas.lng], 17, { animate: true });
        }
        setSelectedSemaphore(semaphore);
        setIsReportModalOpen(false); 
        setInfoWindowVisible(true);  
    };

    const handleCloseInfoWindow = () => {
        setInfoWindowVisible(false);
    };

    const handleCenterMap = (lat, lng) => {
        if (mapInstance) {
            mapInstance.setView([lat, lng], 17, { animate: true }); 
        }
    };

    const handleOpenReportModal = (semaphoreData) => {
        setSelectedSemaphore(semaphoreData); 
        setIsReportModalOpen(true);
        setInfoWindowVisible(false); 
    };
    
    const handleCloseReportModal = () => {
        setIsReportModalOpen(false);
    };

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <MapContainer 
                center={center} 
                zoom={zoom} 
                scrollWheelZoom={true}
                className="leaflet-container-custom" 
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> contributors'
                    url={CARTODB_POSITRON_URL}
                />
                <MapController 
                    onMapSet={setMapInstance}
                    onMapReady={onMapReady}
                    semaphores={semaphores}
                    onMarkerClick={handleMarkerClick}
                />
            </MapContainer>

            {infoWindowVisible && (
                <SemaphoreInfoWindow 
                    semaphore={selectedSemaphore} 
                    onClose={handleCloseInfoWindow}
                    onCenterMap={handleCenterMap} 
                    onReportFailure={() => handleOpenReportModal(selectedSemaphore)}
                />
            )}
            
            {isReportModalOpen && (
                <ReportFailureModal 
                    semaphore={selectedSemaphore} 
                    onClose={handleCloseReportModal} 
                />
            )}
        </div>
    );
}

export default SantiagoMap;