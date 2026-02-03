import React, { useState, useEffect } from 'react';
import api from '../api';
import { io } from 'socket.io-client';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import './StatusPage.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const Icons = {
    Excel: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h8"/><path d="M10 9h4"/></svg>,
    Download: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    Refresh: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>,
    Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
    Activity: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>,
    Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
};

function StatusPage() {
    const [logs, setLogs] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDateModal, setShowDateModal] = useState(false);
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [downloading, setDownloading] = useState(false);
    // Agregamos 'offline' al estado
    const [stats, setStats] = useState({ errors: 0, warnings: 0, ups: 0, offline: 0, info: 0, total: 0 });
    const [modalAction, setModalAction] = useState('export'); 

    useEffect(() => {
        loadData();
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const socketUrl = baseUrl.replace('/api', '');
        const socket = io(socketUrl);

        socket.on('status_update', (data) => {
            if (data.log) setLogs(prev => [data.log, ...prev]);
            setDevices(prevDevices => prevDevices.map(d => {
                if (d.cruceId === data.cruceId) return { ...d, status: data.fullStatus }; 
                return d;
            }));
        });
        return () => socket.disconnect();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resDevices, resLogs, resStats] = await Promise.all([
                api.get('/api/semaphores'),
                api.get('/api/statuslog'),
                api.get('/api/statuslog/stats')
            ]);
            setDevices(resDevices.data);
            setLogs(resLogs.data);
            if(resStats.data) setStats(resStats.data);
        } catch (error) { console.error(error); } finally { setLoading(false); }
    };

    // Gráfico con estado GRIS (Offline)
    const chartData = {
        labels: ['Fallas', 'Anomalía', 'Respaldo UPS', 'Sin Conexión', 'Normal'],
        datasets: [{
            data: [stats.errors, stats.warnings, stats.ups, stats.offline, stats.info],
            backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#94a3b8', '#22c55e'], // Rojo, Amarillo, Azul, Gris, Verde
            borderWidth: 0,
            hoverOffset: 4
        }]
    };

    const generateCSV = (dataLogs, filename) => {
        let csv = "\uFEFF"; 
        csv += "Fecha;Hora;Cruce;Estado;Controlador;Luces;Alimentacion;UPS_Estado;Mensaje\n";

        dataLogs.forEach(l => {
            const d = new Date(l.timestamp);
            const fecha = d.toLocaleDateString('es-CL');
            const hora = d.toLocaleTimeString('es-CL');
            
            let estadoTexto = 'Normal';
            if(l.type === 'error') estadoTexto = 'Falla';
            if(l.type === 'warning') estadoTexto = 'Anomalia';
            if(l.type === 'ups') estadoTexto = 'Respaldo UPS';
            if(l.type === 'offline' || l.controlador === 'Desconocido') estadoTexto = 'Sin Conexion'; // NUEVO

            const ctrl = l.controlador || '-';
            const luc = l.luces || '-';
            const ali = l.alimentacion || '-';
            const upsVol = l.ups_voltaje || 0;
            const upsEstado = upsVol > 20 ? 'Prendido' : 'Apagado';
            
            const msg = l.message ? l.message.replace(/(\r\n|\n|\r)/gm, " ").replace(/;/g, " ") : "";
            
            csv += `${fecha};${hora};${l.cruceId};${estadoTexto};${ctrl};${luc};${ali};${upsEstado};${msg}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleExportAll = async () => { /* ... */ try { const res = await api.get('/api/statuslog?limit=all'); generateCSV(res.data, `reporte_completo_${new Date().toISOString().slice(0,10)}.csv`); } catch (e) { alert("Error al exportar."); } };
    const handleExportRange = async () => { /* ... */ if (!dateRange.start || !dateRange.end) { alert("Fechas incompletas"); return; } setDownloading(true); try { const res = await api.get(`/api/statuslog?startDate=${dateRange.start}&endDate=${dateRange.end}`); if(res.data.length === 0) alert("Sin registros."); else { generateCSV(res.data, `reporte_rango.csv`); setShowDateModal(false); } } catch (e) { alert("Error."); } finally { setDownloading(false); } };
    const handleDeleteRange = async () => { /* ... */ if (!dateRange.start || !dateRange.end) { alert("Fechas incompletas"); return; } if (!window.confirm("¿ELIMINAR PERMANENTEMENTE?")) return; setDownloading(true); try { const res = await api.delete(`/api/statuslog?startDate=${dateRange.start}&endDate=${dateRange.end}`); alert(res.data.message); setShowDateModal(false); loadData(); } catch (e) { alert("Error."); } finally { setDownloading(false); } };
    const handleDownloadPBI = () => { const link = document.createElement('a'); link.href = '/template_eventos_pbi.pbit'; link.download = 'Plantilla.pbit'; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
    const openExportModal = () => { setModalAction('export'); setDateRange({ start: '', end: '' }); setShowDateModal(true); };
    const openDeleteModal = () => { setModalAction('delete'); setDateRange({ start: '', end: '' }); setShowDateModal(true); };
    const handleModalSubmit = () => { modalAction === 'export' ? handleExportRange() : handleDeleteRange(); };
    const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('es-CL') : '-';
    const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('es-CL') : '-';

    // Badge Colores Tabla
    const getStatusBadge = (log) => {
        // Prioridad 1: Sin Conexión (Gris)
        if (log.type === 'offline' || log.controlador === 'Desconocido') {
            return <span className="pill pill-gray">Sin Conexión</span>;
        }
        if (log.type === 'error') return <span className="pill pill-red">Falla</span>;
        if (log.type === 'ups') return <span className="pill pill-blue">Respaldo UPS</span>;
        if (log.type === 'warning') return <span className="pill pill-yellow">Anomalía</span>;
        return <span className="pill pill-green">Normal</span>;
    };

    return (
        <div className="status-page-container">
            <div className="page-header">
                <div><h2 className="standard-title"><span className="title-icon"><Icons.Activity /></span> Monitor de Telemetría</h2><p className="subtitle">Estado operativo y control de red en tiempo real</p></div>
                <div className="actions-toolbar">
                    <button className="btn-action btn-blue" onClick={openExportModal}><Icons.Calendar /> Reporte</button>
                    <button className="btn-action btn-excel" onClick={handleExportAll}><Icons.Excel /> Todo</button>
                    <button className="btn-action btn-pbi" onClick={handleDownloadPBI}><Icons.Download /> PBI</button>
                    <button className="btn-action btn-danger" onClick={openDeleteModal}><Icons.Trash /> Limpiar</button>
                </div>
            </div>

            <div className="analytics-grid">
                <div className="status-card analytics-chart-card"><h4>Distribución 24h</h4><div style={{height: '140px', display:'flex', justifyContent:'center'}}><Doughnut data={chartData} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div></div>
                <div className="status-card analytics-stat-card"><div className="stat-item"><span className="stat-label">Total Eventos</span><span className="stat-value">{stats.total}</span></div><div className="stat-divider"></div><div className="stat-item danger"><span className="stat-label">Críticos</span><span className="stat-value text-red">{stats.errors}</span></div></div>
                 <div className="status-card analytics-stat-card"><div className="stat-item"><span className="stat-label">Online</span><span className="stat-value text-green">{devices.filter(d => d.status?.controlador === 'Prendido').length}</span></div><div className="stat-divider"></div><div className="stat-item"><span className="stat-label">Offline</span><span className="stat-value text-gray">{devices.filter(d => d.status?.controlador !== 'Prendido').length}</span></div></div>
            </div>

            <div className="cards-grid-container">
                {devices.map(d => {
                    const status = d.status || {};
                    const isOnline = status.controlador === 'Prendido';
                    const volt = parseFloat(status.ups_voltaje || 0);

                    // Lógica para detectar el AZUL
                    const isUpsActive = isOnline && status.alimentacion !== 'Prendido' && volt > 20;
                    const isWarning = !isUpsActive && isOnline && (status.luces !== 'Prendido' || volt <= 20);

                    // Por defecto Offline (Gris)
                    let lightClass = 'light-gray';
                    let badgeText = 'SIN CONEXIÓN';
                    let cardClass = 'card-offline';

                    if (isOnline) {
                        if (isUpsActive) {
                            lightClass = 'light-blue';
                            badgeText = 'RESPALDO UPS';
                            cardClass = 'card-ups';
                        } else if (isWarning) {
                            lightClass = 'light-yellow';
                            badgeText = 'ANOMALÍA';
                            cardClass = 'card-warning';
                        } else {
                            lightClass = 'light-green';
                            badgeText = 'EN LÍNEA';
                            cardClass = 'card-online';
                        }
                    }

                    return (
                         <div key={d._id} className={`status-card ${cardClass}`}>
                            <div className="card-top">
                                <div className={`traffic-light ${lightClass}`}></div>
                                <span className="status-text-badge">{badgeText}</span>
                            </div>
                            <div className="card-info">
                                <h4>{d.cruce}</h4>
                                <div className="card-meta"><span className="meta-id">ID: {d.cruceId}</span></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="table-container">
                <div className="table-header-control"><h3>Registro de Eventos</h3><button className="btn-refresh" onClick={loadData}><Icons.Refresh /></button></div>
                <div className="responsive-table">
                    <table>
                        <thead>
                            <tr>
                                <th style={{width:'90px'}}>Fecha</th>
                                <th style={{width:'90px'}}>Hora</th>
                                <th style={{width:'100px'}}>Cruce ID</th>
                                <th>Estado</th>
                                <th>Controlador</th>
                                <th>Luces</th>
                                <th>Energía</th>
                                <th>UPS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan="8" className="text-center">Cargando...</td></tr> : 
                             logs.length === 0 ? <tr><td colSpan="8" className="text-center">Sin registros.</td></tr> : 
                             logs.map((log, i) => {
                                const upsOn = (log.ups_voltaje || 0) > 20;
                                return (
                                    <tr key={log._id || i} className="fade-in-row">
                                        <td className="font-mono">{formatDate(log.timestamp)}</td>
                                        <td className="font-mono">{formatTime(log.timestamp)}</td>
                                        <td className="font-bold">{log.cruceId}</td>
                                        <td>{getStatusBadge(log)}</td>
                                        <td><span className={`pill ${log.controlador === 'Prendido' ? 'pill-green' : 'pill-gray'}`}>{log.controlador}</span></td>
                                        <td><span className={`pill ${log.luces === 'Prendido' ? 'pill-green' : 'pill-gray'}`}>{log.luces}</span></td>
                                        <td><span className={`pill ${log.alimentacion === 'Prendido' ? 'pill-green' : 'pill-red'}`}>{log.alimentacion}</span></td>
                                        <td><span className={`pill ${upsOn ? 'pill-green' : 'pill-red'}`}>{upsOn ? 'Prendido' : 'Apagado'}</span></td>
                                    </tr>
                                );
                             })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Modal... (Sin cambios) */}
            {showDateModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{modalAction === 'export' ? 'Descargar' : 'Eliminar'}</h3>
                        <div className="date-inputs">
                            <div className="form-group"><label>Desde</label><input type="date" className="form-input" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} /></div>
                            <div className="form-group"><label>Hasta</label><input type="date" className="form-input" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} /></div>
                        </div>
                        <div className="modal-actions"><button className="btn-cancel" onClick={() => setShowDateModal(false)}>Cancelar</button><button className="btn-save" onClick={handleModalSubmit}>{modalAction === 'export' ? 'Descargar' : 'Eliminar'}</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}
export default StatusPage;