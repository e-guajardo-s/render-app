import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOverallStatus, getStatusPillClass } from '../utils/statusHelper'; 
import './SemaphoreInfoWindow.css';

// ─── Componente UPS Autonomía ────────────────────────────────────────────────
const UPS_AUTONOMIA_HORAS = 5;
const UPS_AUTONOMIA_MS    = UPS_AUTONOMIA_HORAS * 60 * 60 * 1000;

// Alertas: [minutos restantes, mensaje]
const ALERTAS = [
    { minutos: 240, msg: '4 horas de autonomía restantes',  mostrado: false },
    { minutos: 180, msg: '3 horas de autonomía restantes',  mostrado: false },
    { minutos: 120, msg: '2 horas de autonomía restantes',  mostrado: false },
    { minutos:  60, msg: '⚠️ 1 hora de autonomía restante',   mostrado: false },
    { minutos:  30, msg: '🚨 30 minutos restantes',            mostrado: false },
    { minutos:  15, msg: '🚨 15 minutos restantes',            mostrado: false },
    { minutos:  10, msg: '🔴 10 minutos restantes — ¡Crítico!',  mostrado: false },
    { minutos:   0, msg: '⚫ Autonomía agotada',               mostrado: false },
];

function UpsAutonomia({ upsInicio }) {
    const [ahora, setAhora]         = useState(Date.now());
    const [alerta, setAlerta]       = useState(null);
    const alertasRef                = useRef(ALERTAS.map(a => ({ ...a }))); // copia mutable por instancia

    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            setAhora(now);

            // Calcular minutos restantes
            const transcurrido = now - new Date(upsInicio).getTime();
            const restanteMs   = UPS_AUTONOMIA_MS - transcurrido;
            const restanteMin  = Math.floor(restanteMs / 60000);

            // Disparar alerta si toca
            for (const a of alertasRef.current) {
                if (!a.mostrado && restanteMin <= a.minutos) {
                    a.mostrado = true;
                    setAlerta(a.msg);
                    setTimeout(() => setAlerta(null), 8000);
                    break;
                }
            }
        }, 10000); // actualizar cada 10s

        return () => clearInterval(interval);
    }, [upsInicio]);

    if (!upsInicio) return null;

    const inicio      = new Date(upsInicio).getTime();
    const transcurrido = ahora - inicio;
    const porcentaje  = Math.max(0, Math.min(100, ((UPS_AUTONOMIA_MS - transcurrido) / UPS_AUTONOMIA_MS) * 100));
    const restanteMs  = Math.max(0, UPS_AUTONOMIA_MS - transcurrido);
    const restanteMin = Math.floor(restanteMs / 60000);
    const horas       = Math.floor(restanteMin / 60);
    const minutos     = restanteMin % 60;

    // Color según porcentaje restante
    const color = porcentaje > 50 ? '#22c55e'   // verde
                : porcentaje > 20 ? '#f59e0b'   // amarillo
                :                   '#ef4444';   // rojo

    const textoTiempo = restanteMin <= 0
        ? 'Autonomía agotada'
        : horas > 0
            ? `${horas}h ${minutos.toString().padStart(2,'0')}min restantes`
            : `${minutos} min restantes`;

    // Hora de inicio formateada
    const horaInicio = new Date(upsInicio).toLocaleTimeString('es-CL', { hour:'2-digit', minute:'2-digit' });

    return (
        <div className="ups-autonomia-wrapper">
            {/* Alerta toast */}
            {alerta && (
                <div className="ups-alerta-toast">
                    <span>{alerta}</span>
                </div>
            )}

            <div className="ups-autonomia-header">
                <span className="ups-autonomia-titulo">🔋 Respaldo UPS</span>
                <span className="ups-autonomia-inicio">desde {horaInicio}</span>
            </div>

            {/* Barra de carga */}
            <div className="ups-barra-fondo">
                <div
                    className="ups-barra-relleno"
                    style={{
                        width: `${porcentaje}%`,
                        background: color,
                        transition: 'width 1s ease, background 1s ease'
                    }}
                />
                {/* Marcas de horas */}
                {[80, 60, 40, 20].map(pct => (
                    <div key={pct} className="ups-barra-marca" style={{ left: `${pct}%` }} />
                ))}
            </div>

            {/* Texto de tiempo restante */}
            <div className="ups-autonomia-texto" style={{ color }}>
                <span className="ups-autonomia-pct">{Math.round(porcentaje)}%</span>
                <span className="ups-autonomia-tiempo">{textoTiempo}</span>
            </div>

            {/* Escala debajo de la barra */}
            <div className="ups-escala">
                <span>5h</span>
                <span>4h</span>
                <span>3h</span>
                <span>2h</span>
                <span>1h</span>
                <span>0</span>
            </div>
        </div>
    );
}
// ───────────────────────────────────────────────────────────────────────────── 

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

    const { cruce, cruceId, UOCT, red, controlador, status, monitoreando } = semaphore;

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
    const { key: statusKey, text: statusText } = getOverallStatus(status, monitoreando, semaphore.enMantencion);
    const statusClassName = getStatusPillClass(statusKey);

    // --- LÓGICA INDIVIDUAL DE VARIABLES ---
    const isUTCOk = status?.controlador === 'Prendido' || status?.controlador === true;
    const isAlimOk = status?.alimentacion === 'Prendido' || status?.alimentacion === true;
    const isLucesOk = status?.luces === 'Prendido' || status?.luces === true;

    // UPS: voltaje 0-12V. >6V = batería OK, <=6V = batería baja/agotada
    const rawUpsVal = parseFloat(status?.ups_voltaje ?? status?.ups ?? 0);
    const upsVal = isNaN(rawUpsVal) ? 0 : rawUpsVal;
    const isUpsOk = upsVal > 6;

    return (
        <div className="info-window-backdrop" onClick={onClose}>
            <div className="info-window-container" onClick={(e) => e.stopPropagation()}>
                
                <div className="info-window-header">
                    <h2>{cruce || 'Detalle del Semáforo'}</h2>
                    <button className="info-window-close" onClick={onClose}>×</button>
                </div>

                <div className="info-window-body">
                    
                    {/* --- BANNER MANTENCIÓN --- */}
                    {semaphore.enMantencion && (
                        <div style={{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:6,padding:'8px 12px',marginBottom:12,display:'flex',alignItems:'center',gap:8}}>
                            <span style={{fontSize:'1rem'}}>🔧</span>
                            <div>
                                <span style={{fontWeight:700,color:'#92400e',fontSize:'0.85rem'}}>En Mantención</span>
                                {semaphore.mantencionMotivo && <p style={{margin:0,fontSize:'0.78rem',color:'#b45309'}}>{semaphore.mantencionMotivo}</p>}
                            </div>
                        </div>
                    )}

                    {/* --- BANNER DE TICKETS PENDIENTES --- */}
                    {semaphore.hasActiveTicket && (
                        <div className="ticket-alert-banner" onClick={handleGoToTickets} title="Ver Tickets">
                            <div className="alert-content">
                                <span className="alert-icon"><Icons.Alert /></span>
                                <span className="alert-text">Tickets Pendientes</span>
                            </div>
                            <span className="alert-arrow"><Icons.ArrowRight /></span>
                        </div>
                    )}

                    <div className={`info-window-status-pill ${statusClassName}`}>
                        Estado: {statusText}
                    </div>

                    {/* --- AUTONOMÍA UPS (solo cuando está en respaldo) --- */}
                    {statusKey === 'UPS' && (
                        <UpsAutonomia upsInicio={status?.ups_inicio} />
                    )}

                    <div className="info-window-status-grid">
                        <StatusIndicator label="UTC"         isOk={isUTCOk} />
                        <StatusIndicator label="Luces"       isOk={isLucesOk} />
                        <StatusIndicator label="Alimentación" isOk={isAlimOk} />
                        {/* Solo mostrar UPS si el semáforo tiene UPS instalado */}
                        {semaphore.tieneUPS !== false && (
                            <StatusIndicator label="UPS" isOk={isUpsOk} />
                        )}
                    </div>
                    
                    <div className="info-window-details">
                        <p><strong>ID:</strong> {cruceId || 'N/A'}</p>
                        <p><strong>UOCT:</strong> {UOCT || 'N/A'}</p>
                        <p><strong>RED:</strong> {red || 'N/A'}</p>
                        <p><strong>CONTROLADOR:</strong> {controlador || 'N/A'}</p>
                    </div>
                </div>

                <div className="info-window-footer">
                    <button className="report-failure-button" onClick={handleReportClick}>
                        Reportar Falla
                    </button>
                    <button
                        className="doc-button"
                        style={{background:'#6c757d'}}
                        onClick={() => { navigate(`/semaphores`); onClose(); }}
                        title="Ver historial en Semáforos"
                    >
                        Historial
                    </button>
                    <button className="doc-button" onClick={handleGoToDocs}>
                        Documentación
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SemaphoreInfoWindow;