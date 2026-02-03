import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'; // Usamos Marker en vez de CircleMarker
import L from 'leaflet'; // Necesario para crear el icono personalizado
import SemaphoreInfoWindow from './SemaphoreInfoWindow';
import ReportFailureModal from './ReportFailureModal'; 
import { getOverallStatus, getStatusColor } from '../utils/statusHelper';
import 'leaflet/dist/leaflet.css';
import './SantiagoMap.css'; 

const CARTODB_POSITRON_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

// --- FUNCIÓN PARA CREAR EL ICONO PERSONALIZADO (CSS) ---
const createCustomIcon = (statusKey, hasActiveTicket) => {
    const color = getStatusColor(statusKey);
    
    // Si hay ticket, inyectamos el HTML del puntito amarillo
    const ticketBadgeHTML = hasActiveTicket 
        ? `<div class="ticket-badge-indicator" title="Ticket Pendiente">!</div>` 
        : '';

    // Creamos un DivIcon de Leaflet
    return L.divIcon({
        className: 'custom-div-icon', // Clase base vacía para no heredar estilos feos de Leaflet
        html: `
            <div class="semaphore-marker-wrapper">
                <div class="semaphore-marker-body" style="background-color: ${color}; box-shadow: 0 0 8px ${color}80;">
                    <div class="marker-core"></div>
                </div>
                ${ticketBadgeHTML}
            </div>
        `,
        iconSize: [24, 24],   // Tamaño del contenedor
        iconAnchor: [12, 12], // Punto de anclaje (centro)
        popupAnchor: [0, -12] // Donde sale el popup si lo hubiera
    });
};

// --- CONTROLADOR DEL MAPA ---
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
        <>
            {semaphoresWithCoords.map(sem => {
                // 1. Obtener estado
                const { key: statusKey } = getOverallStatus(sem.status);
                
                // 2. Verificar si tiene ticket (propiedad inyectada por el Dashboard)
                const hasTicket = sem.hasActiveTicket === true;

                // 3. Crear icono
                const icon = createCustomIcon(statusKey, hasTicket);

                return (
                    <Marker
                        key={sem._id || sem.cruceId}
                        position={[sem.coordenadas.lat, sem.coordenadas.lng]}
                        icon={icon} // Usamos el icono HTML personalizado
                        eventHandlers={{
                            click: (e) => {
                                L.DomEvent.stopPropagation(e); // Detener click del mapa
                                onMarkerClick(sem); 
                            },
                        }}
                    />
                );
            })}
        </>
    );
}

// --- COMPONENTE PRINCIPAL ---
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
        // No limpiamos selectedSemaphore para que al cerrar no se pierda el contexto si quisiéramos volver
        // pero en este flujo está bien.
    };

    return (
        <div style={{ position: 'relative', height: '100%', width: '100%' }}>
            <MapContainer 
                center={center} 
                zoom={zoom} 
                scrollWheelZoom={true}
                className="leaflet-container-custom" // Clase para asegurar z-index correcto
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