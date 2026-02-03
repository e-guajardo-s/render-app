import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getOverallStatus, getStatusPillClass } from '../utils/statusHelper'; 
import './SemaphoreInfoWindow.css'; 

// Definimos los iconos aquí mismo para no depender de archivos externos
const Icons = {
    Alert: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>,
    ArrowRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
};

const StatusIndicator = ({ label, isOk, valueText }) => (
    <div className="status-item">
        <span className={`status-light ${isOk ? 'green' : 'red'}`}></span>
        <span className="status-label">
            {label} 
            {valueText && <small style={{color: '#666', marginLeft: '5px'}}>({valueText})</small>}
        </span>
    </div>
);

function SemaphoreInfoWindow({ semaphore, onClose, onReportFailure }) {
    const navigate = useNavigate();
    
    if (!semaphore) {
        return null;
    }

    const { cruce, cruceId, UOCT, red, controlador, status } = semaphore;

    const handleReportClick = () => {
        onReportFailure(semaphore); 
    };

    const handleGoToDocs = () => {
        navigate(`/documentacion?semId=${semaphore._id}`);
        onClose(); 
    };

    

    // --- NUEVO: Ir a tickets ---
    const handleGoToTickets = () => {
        // Navegamos a /tickets pero le pasamos el ID del cruce en el "state"
        navigate('/tickets', { state: { highlightCruceId: cruceId } });
    };

    // --- LÓGICA DE ESTADO GLOBAL ---
    const { key: statusKey, text: statusText } = getOverallStatus(status);
    const statusClassName = getStatusPillClass(statusKey);

    // --- LÓGICA INDIVIDUAL DE VARIABLES ---
    const isControladorOk = status?.controlador === 'Prendido' || status?.controlador === true;
    const isAlimOk = status?.alimentacion === 'Prendido' || status?.alimentacion === true;
    const isLucesOk = status?.luces === 'Prendido' || status?.luces === true;

    // Lógica UPS Numérica:
    const upsVal = parseFloat(status?.ups_voltaje || 0);
    const isUpsOk = upsVal > 20; 

    return (
        <div className="info-window-backdrop" onClick={onClose}>
            <div className="info-window-container" onClick={(e) => e.stopPropagation()}>
                
                <div className="info-window-header">
                    <h2>{cruce || 'Detalle del Semáforo'}</h2>
                    <button className="info-window-close" onClick={onClose}>×</button>
                </div>

                <div className="info-window-body">
                    
                    {/* --- AQUI AGREGAMOS EL BANNER DE TICKETS PENDIENTES --- */}
                    {semaphore.hasActiveTicket && (
                        <div className="ticket-alert-banner" onClick={handleGoToTickets} title="Ver Tickets">
                            <div className="alert-content">
                                <span className="alert-icon"><Icons.Alert /></span>
                                <span className="alert-text">Tickets Pendientes</span>
                            </div>
                            <span className="alert-arrow"><Icons.ArrowRight /></span>
                        </div>
                    )}
                    {/* ----------------------------------------------------- */}

                    <div className={`info-window-status-pill ${statusClassName}`}>
                        Estado: {statusText}
                    </div>
                    
                    <div className="info-window-status-grid">
                        <StatusIndicator label="Controlador" isOk={isControladorOk} />
                        <StatusIndicator label="Luces" isOk={isLucesOk} />
                        <StatusIndicator label="Alimentación" isOk={isAlimOk} />
                        <StatusIndicator 
                            label="UPS" 
                            isOk={isUpsOk} 
                            valueText={`${upsVal}V`} // Mostramos el voltaje
                        />
                    </div>
                    
                    <div className="info-window-details">
                        <p><strong>ID:</strong> {cruceId || 'N/A'}</p>
                        <p><strong>UOCT:</strong> {UOCT || 'N/A'}</p>
                        <p><strong>RED:</strong> {red || 'N/A'}</p>
                        <p><strong>CONTROLADOR:</strong> {controlador || 'N/A'}</p>
                    </div>
                </div>

                <div className="info-window-footer">
                    <button 
                        className="report-failure-button" 
                        onClick={handleReportClick}
                    >
                        Reportar Falla
                    </button>
                    
                    <button 
                        className="doc-button" 
                        onClick={handleGoToDocs}
                    >
                        Documentación
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SemaphoreInfoWindow;