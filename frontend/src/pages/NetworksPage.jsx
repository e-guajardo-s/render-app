import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useSocket } from '../context/SocketContext';
import './NetworksPage.css';

// --- ICONOS SVG ---
const Icons = {
  Search: () => <svg className="icon-svg icon-sm" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
  Terminal: () => <svg className="icon-svg mr-2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" /></svg>,
  Trash: () => <svg className="icon-svg icon-sm" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
  Edit: () => <svg className="icon-svg icon-sm" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" /></svg>,
  Save: () => <svg className="icon-svg mr-2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V7.5m-10.5 6L12 3m0 0l-1.5 1.5M12 3v13.5" /></svg>,
  Wifi: () => <svg className="icon-svg icon-sm" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" /></svg>,
  Cloud: () => <svg className="icon-svg icon-sm" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>,
  Eye: () => <svg className="icon-svg icon-sm" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  EyeOff: () => <svg className="icon-svg icon-sm" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>,
  Lock: () => <svg className="icon-svg icon-lg" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>,
  Cpu: () => <svg className="icon-svg" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25z" /></svg>,
  Settings: () => <svg className="icon-svg icon-sm" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
};

function NetworksPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [userRole, setUserRole] = useState(''); // Rol del usuario actual

  // Estado para modo "Cambiar Contraseña"
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [newMasterPass, setNewMasterPass] = useState('');
  const [savePassLoading, setSavePassLoading] = useState(false);

  // --- Estados de Datos ---
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Estados de Edición ---
  const [isEditing, setIsEditing] = useState(false);
  const [editIp, setEditIp] = useState('');
  const [editTopic, setEditTopic] = useState('');
  const [brokerConfig, setBrokerConfig] = useState({ host: '', port: 1883, username: '', password: '' });
  
  const [isSaving, setIsSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // --- Estados Sniffer ---
  const [logs, setLogs] = useState(() => {
    try {
      const saved = sessionStorage.getItem('mqtt_sniffer_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const terminalEndRef = useRef(null);
  const midnightTimerRef = useRef(null);
  const socket = useSocket(); // Socket compartido

  // 1. CARGA INICIAL
  useEffect(() => {
    // --- OBTENCIÓN ROBUSTA DEL ROL ---
    const storedRole = localStorage.getItem('role');
    const storedUser = localStorage.getItem('user'); // Por si tu login guarda un objeto 'user'
    
    let detectedRole = '';
    
    if (storedRole) {
        detectedRole = storedRole;
    } else if (storedUser) {
        try {
            const userObj = JSON.parse(storedUser);
            detectedRole = userObj.role || '';
        } catch (e) {
            console.log("Error parseando user de localStorage");
        }
    }
    
    console.log("Rol Detectado en NetworksPage:", detectedRole); // <--- MIRA ESTO EN LA CONSOLA (F12)
    setUserRole(detectedRole.toLowerCase()); // Forzamos minúsculas
    // ---------------------------------

    fetchDevices();

    // Limpiar logs en memoria a las 00:00
    const scheduleMidnightClear = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      const msUntilMidnight = nextMidnight.getTime() - now.getTime();
      return setTimeout(() => {
        try { sessionStorage.removeItem('mqtt_sniffer_logs'); } catch {}
        setLogs([]);
        addLog('SYSTEM', 'Logs limpiados automáticamente (nueva jornada 00:00)');
        midnightTimerRef.current = scheduleMidnightClear();
      }, msUntilMidnight);
    };
    midnightTimerRef.current = scheduleMidnightClear();

    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
    };
  }, []);

  // Listeners del socket compartido
  useEffect(() => {
    if (!socket) return;

    const handleMqttMessage = (data) => addLog(data.topic, data.message);
    const handleStatusUpdate = (updatedData) => {
      setDevices(prev => prev.map(d =>
        d.cruceId === updatedData.cruceId
          ? {
              ...d,
              status: updatedData.fullStatus,
              ...(updatedData.monitoreando !== undefined && { monitoreando: updatedData.monitoreando })
            }
          : d
      ));
    };

    socket.on('mqtt_message', handleMqttMessage);
    socket.on('status_update', handleStatusUpdate);
    return () => {
      socket.off('mqtt_message', handleMqttMessage);
      socket.off('status_update', handleStatusUpdate);
    };
  }, [socket]);

  const addLog = (topic, msg) => {
    const now = new Date();
    const time = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const date = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    setLogs(prev => {
      const next = [...prev, { time, date, topic, msg }];
      // Persistir en sessionStorage (máx 500 entradas para no saturar)
      try { sessionStorage.setItem('mqtt_sniffer_logs', JSON.stringify(next.slice(-500))); } catch {}
      return next;
    });
  };

  const fetchDevices = async () => {
    try {
      const res = await api.get('/api/semaphores');
      const sorted = [...res.data].sort((a, b) => {
          const nA = parseInt(a.cruceId, 10);
          const nB = parseInt(b.cruceId, 10);
          if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
          return String(a.cruceId).localeCompare(String(b.cruceId), undefined, { numeric: true });
      });
      setDevices(sorted);
      setLoading(false);
    } catch (e) { setLoading(false); }
  };

  // 2. SELECCIÓN DE DISPOSITIVO
  useEffect(() => {
    if (selectedDevice) {
      resetFormValues(); 
      setIsEditing(false); 
      setLogs([]);
      addLog('SYSTEM', `Conectando a: ${selectedDevice.cruceId}...`);

      if (selectedDevice.mqtt_topic) {
          fetchHistory(selectedDevice.mqtt_topic);
          if (socket) socket.emit('join_room', selectedDevice.mqtt_topic);
      } else {
          addLog('SYSTEM', 'No hay Tópico configurado.');
      }
    }
  }, [selectedDevice]);

  const resetFormValues = () => {
    if (!selectedDevice) return;
    setEditIp(selectedDevice.ip_gateway || '');
    setEditTopic(selectedDevice.mqtt_topic || '');
    // Broker propio del semáforo, o campos vacíos si no tiene configurado
    setBrokerConfig(selectedDevice.mqtt_config?.host
        ? selectedDevice.mqtt_config
        : { host: '', port: 8883, username: '', password: '' }
    );
  };

  const fetchHistory = async (topic) => {
     try {
       const res = await api.get(`/api/mqtt-logs?topic=${encodeURIComponent(topic)}`);
       if (res.data && res.data.length > 0) {
           const history = res.data.map(log => ({
               time: new Date(log.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
               date: new Date(log.timestamp).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
               topic: log.topic, msg: log.message
           }));
           setLogs(prev => [...prev, ...history, { time: '--:--', topic: '---', msg: '--- FIN HISTORIAL ---' }]);
       } else { addLog('SYSTEM', 'Sin historial previo.'); }
     } catch (e) { addLog('ERROR', 'Error cargando historial.'); }
  };

  const handleClearHistory = async () => {
    if (!selectedDevice?.mqtt_topic) return;
    if (window.confirm("¿Confirmas eliminar todo el historial de la BD?")) {
      try {
        await api.delete(`/api/mqtt-logs?topic=${encodeURIComponent(selectedDevice.mqtt_topic)}`);
        try { sessionStorage.removeItem('mqtt_sniffer_logs'); } catch {}
        setLogs([]);
        addLog('SYSTEM', 'Base de datos limpiada.');
      } catch (e) { alert("Error al borrar."); }
    }
  };

  // --- LÓGICA DE DESBLOQUEO SEGURA (VÍA API) ---
  const handleUnlock = async (e) => {
    e.preventDefault();
    setAuthError('');
    
    try {
        // Enviar contraseña al backend para verificar
        await api.post('/api/settings/verify-network-pass', { password });
        setIsUnlocked(true); // Si no lanza error, es correcta
    } catch (error) {
        const status = error.response?.status;
        const code = error.response?.data?.code;
        if (status === 401) {
            setAuthError('Contraseña incorrecta.');
        } else if (status === 503 || code === 'NOT_INITIALIZED') {
            setAuthError('La contraseña maestra no ha sido configurada. Contacta al superadmin.');
        } else if (status === 404) {
            setAuthError('Error: Ruta /api/settings no encontrada en el backend.');
        } else if (status === 500) {
            setAuthError('Error interno del servidor. Revisa los logs del backend.');
        } else {
            setAuthError(`Error de conexión (${status || 'sin respuesta'}). Verifica que el backend esté corriendo.`);
        }
        setPassword('');
    }
  };

  // --- LÓGICA CAMBIAR CLAVE (SUPERADMIN) ---
  const handleUpdateMasterPass = async (e) => {
      e.preventDefault();
      if(newMasterPass.length < 6) {
          alert("La nueva clave debe tener al menos 6 caracteres.");
          return;
      }
      setSavePassLoading(true);
      try {
          await api.put('/api/settings/update-network-pass', { newPassword: newMasterPass });
          alert("¡Contraseña maestra actualizada correctamente!");
          setIsChangingPass(false);
          setNewMasterPass('');
      } catch (error) {
          alert("Error al actualizar la contraseña.");
          console.error(error);
      } finally {
          setSavePassLoading(false);
      }
  };

  // --- UMBRALES ---
  const [thresholds, setThresholds]     = useState({ watchdogMinutes: 20, upsThreshold: 12, inactivityLimit: 20 });
  const [thresholdsLoaded, setTLoaded]  = useState(false);
  const [savingThr, setSavingThr]       = useState(false);
  const [thrMsg, setThrMsg]             = useState('');

  useEffect(() => {
    api.get('/api/settings/thresholds').then(r => { setThresholds(r.data); setTLoaded(true); }).catch(() => {});
  }, []);

  const handleSaveThresholds = async () => {
    setSavingThr(true); setThrMsg('');
    try {
      await api.put('/api/settings/thresholds', thresholds);
      setThrMsg('Umbrales guardados correctamente.');
      setTimeout(() => setThrMsg(''), 3000);
    } catch { setThrMsg('Error al guardar.'); }
    finally { setSavingThr(false); }
  };

  // --- GUARDAR CONFIGURACIÓN DISPOSITIVO (solo IP, tópico y broker) ---
  // La página es SOLO LECTURA para el sniffer.
  // La configuración del broker se guarda aquí y el backend la usa al conectar.
  const handleSaveConfig = async () => {
    if (!selectedDevice) return;
    setIsSaving(true);
    try {
      const res = await api.put(`/api/semaphores/${selectedDevice._id}`, {
        ip_gateway:  editIp,
        mqtt_topic:  editTopic,
        mqtt_config: brokerConfig   // broker propio por semáforo
      });
      const updated = devices.map(d => d._id === selectedDevice._id ? res.data : d);
      setDevices(updated);
      setSelectedDevice(res.data);
      setIsEditing(false);
      alert('Configuración guardada. El broker se usará la próxima vez que el backend reinicie.');
    } catch { alert('Error al guardar.'); }
    finally { setIsSaving(false); }
  };

  const filtered = devices.filter(d => d.cruce.toLowerCase().includes(searchTerm.toLowerCase()) || d.cruceId.toLowerCase().includes(searchTerm.toLowerCase()));

  // SCROLL AUTOMÁTICO
  useEffect(() => { terminalEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  // --- VISTA BLOQUEADA ---
  if (!isUnlocked) {
    return (
      <div className="iot-page-wrapper center-lock">
      <div className="lock-card">
        <div className="lock-icon-container">
        {/* Icono de candado Modern Pro */}
        <svg width="35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        </div>

        {!isChangingPass ? (
        <>
          <h2>Panel de Ingeniería</h2>
          <p>Acceso restringido para configuración de red e IoT</p>
          <form onSubmit={handleUnlock}>
            <input
              type="password"
              placeholder="Ingrese clave maestra"
              className="form-input-pro"
              style={{marginBottom: '1.5rem'}}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            {authError && <p style={{color:'#ef4444', fontSize:'0.85rem', marginTop:'-1rem', marginBottom:'1rem'}}>{authError}</p>}
            <button type="submit" className="btn-pro-dark">
              Desbloquear Sistema
            </button>
          </form>

          {userRole === 'superadmin' && (
            <div style={{marginTop: '2rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem'}}>
              <button
                type="button"
                onClick={() => setIsChangingPass(true)}
                style={{background:'none', border:'none', color:'#ff9900', fontSize:'0.8rem', cursor:'pointer', fontWeight: '600'}}
              >
                ⚙️ Administrar Clave Maestra
              </button>
            </div>
          )}
        </>
        ) : (
        <>
          <h2>Nueva Clave Maestra</h2>
          <p>Establezca la nueva contraseña global de ingeniería</p>
          <form onSubmit={handleUpdateMasterPass}>
            <input
              type="password"
              placeholder="Nueva Contraseña"
              className="form-input-pro"
              style={{marginBottom: '1rem'}}
              value={newMasterPass}
              onChange={(e) => setNewMasterPass(e.target.value)}
              autoFocus
            />

            <div style={{display:'flex', gap:'10px'}}>
              <button type="button" className="btn-pro-dark" style={{background: '#f1f5f9', color: '#475569'}} onClick={() => setIsChangingPass(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-pro-dark" style={{background: '#ff9900'}} disabled={savePassLoading}>
                {savePassLoading ? '...' : 'Actualizar'}
              </button>
            </div>
          </form>
        </>
        )}
        </div>
      </div>
    );
  }

  // --- VISTA PRINCIPAL (DASHBOARD) ---
  return (
    <div className="iot-dashboard-container">
      <div className="iot-main-grid">
        
        {/* LISTA */}
        <div className="device-list-panel">
          <div className="list-header">
            <h3><Icons.Cpu /> Dispositivos</h3>
            <div className="search-wrapper">
              <div className="search-icon-absolute"><Icons.Search /></div>
              <input type="text" placeholder="Buscar ID o Cruce..." className="search-input"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="device-list-content">
            {filtered.map(d => (
              <div key={d._id} className={`device-item ${selectedDevice?._id === d._id ? 'active' : ''}`} onClick={() => setSelectedDevice(d)}>
                <div><div className="device-name">{d.cruce}</div><div className="device-id">{d.cruceId}</div></div>
                <div className={`status-dot ${d.ip_gateway ? 'on' : 'off'}`}></div>
              </div>
            ))}
          </div>
        </div>

        {/* TERMINAL */}
        <div className="center-panel">
          <div className="terminal-container">
            <div className="terminal-header">
               <div className="terminal-title">
                 <Icons.Terminal /> MQTT SNIFFER
               </div>
               <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                 {selectedDevice ? (
                   <>
                     <span className={`connection-status ${selectedDevice.mqtt_topic ? 'status-active' : 'status-inactive'}`}>
                       {selectedDevice.mqtt_topic ? 'CONNECTED' : 'OFFLINE'}
                     </span>
                     <button className="btn-danger-ghost" onClick={handleClearHistory} title="Limpiar BD">
                       <Icons.Trash /> Borrar Logs
                     </button>
                   </>
                 ) : <span className="connection-status status-inactive">IDLE</span>}
               </div>
            </div>
            <div className="terminal-logs">
              {logs.length === 0 && <div style={{textAlign:'center', color:'#475569', marginTop:'2rem'}}>Esperando datos...</div>}
              {logs.map((l, i) => (
                <div key={i} className="log-entry">
                  <span className="log-time">{l.date && <span className="log-date">{l.date} </span>}{l.time}</span>
                  <span className="log-topic">{l.topic}</span>
                  <span className="log-msg">{l.msg}</span>
                </div>
              ))}
              <div ref={terminalEndRef}/>
            </div>
          </div>
        </div>

        {/* INSPECTOR */}
        <div className="inspector-panel">
          {selectedDevice ? (
            <>
              <div className="inspector-header">
                <div>
                    <h3>Configuración</h3>
                    <div className="id-badge"><Icons.Cpu /> {selectedDevice.cruceId}</div>
                </div>
                {!isEditing && (
                    <button className="btn-icon" onClick={() => setIsEditing(true)} title="Editar Configuración">
                        <Icons.Edit />
                    </button>
                )}
              </div>

              <div className="config-form">
                <div className="section-label"><Icons.Wifi /> <span className="ml-2">Conectividad Local</span> <div className="section-line"></div></div>
                
                <div className="form-group">
                  <label>Nombre del Cruce</label>
                  <input type="text" value={selectedDevice.cruce} disabled className="input-readonly" />
                </div>
                <div className="form-group">
                  <label>IP Gateway (WAN)</label>
                  <input type="text" placeholder="Ej: 192.168.1.1" className="form-input"
                    value={editIp} onChange={(e) => setEditIp(e.target.value)} disabled={!isEditing} />
                </div>
                <div className="form-group">
                  <label>Tópico Principal</label>
                  <input type="text" placeholder="Ej: stgo/renca/cruce22" className="form-input"
                    value={editTopic} onChange={(e) => setEditTopic(e.target.value)} disabled={!isEditing} />
                </div>

                <div className="section-label"><Icons.Cloud /> <span className="ml-2">Broker HiveMQ</span> <div className="section-line"></div></div>
                
                <div style={{display:'flex', gap:'10px'}}>
                  <div className="form-group" style={{flex: 2}}>
                    <label>Host Cluster</label>
                    <input type="text" className="form-input" value={brokerConfig.host} onChange={(e) => setBrokerConfig({...brokerConfig, host: e.target.value})} disabled={!isEditing} />
                  </div>
                  <div className="form-group" style={{flex: 1}}>
                    <label>Puerto</label>
                    <input type="number" className="form-input" value={brokerConfig.port} onChange={(e) => setBrokerConfig({...brokerConfig, port: e.target.value})} disabled={!isEditing} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Usuario</label>
                  <input type="text" className="form-input" value={brokerConfig.username} onChange={(e) => setBrokerConfig({...brokerConfig, username: e.target.value})} disabled={!isEditing} />
                </div>
                <div className="form-group">
                  <label>Contraseña</label>
                  <div style={{display: 'flex', position: 'relative'}}>
                    <input type={showPass ? "text" : "password"} className="form-input" style={{paddingRight: '40px'}}
                      value={brokerConfig.password} onChange={(e) => setBrokerConfig({...brokerConfig, password: e.target.value})} disabled={!isEditing} />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8'}}>
                      {showPass ? <Icons.EyeOff /> : <Icons.Eye />}
                    </button>
                  </div>
                </div>

                {isEditing && (
                    <div className="edit-actions">
                        <button className="btn-secondary" onClick={() => {resetFormValues(); setIsEditing(false);}}>Cancelar</button>
                        <button className="btn-primary" onClick={handleSaveConfig} disabled={isSaving}>
                            <Icons.Save /> {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                )}
              </div>
            </>
          ) : (
            <div className="config-form">
              <div className="empty-state" style={{marginBottom:'1.5rem'}}>
                <div style={{color:'#cbd5e1', marginBottom:'0.5rem'}}><Icons.Cpu /></div>
                <p style={{color:'#64748b',margin:0}}>Selecciona un dispositivo</p>
              </div>

              {/* Umbrales del sistema */}
              {thresholdsLoaded && (
                <>
                  <div className="section-label"><Icons.Settings /> <span className="ml-2">Umbrales del Sistema</span> <div className="section-line"></div></div>
                  <div className="form-group">
                    <label>Watchdog (minutos sin señal)</label>
                    <input type="number" className="form-input" min={1} max={120}
                      value={thresholds.watchdogMinutes}
                      onChange={e => setThresholds(p => ({...p, watchdogMinutes: Number(e.target.value)}))}
                    />
                  </div>
                  <div className="form-group">
                    <label>Umbral UPS (voltios = activo)</label>
                    <input type="number" className="form-input" min={1} max={24}
                      value={thresholds.upsThreshold}
                      onChange={e => setThresholds(p => ({...p, upsThreshold: Number(e.target.value)}))}
                    />
                  </div>
                  {thrMsg && <p style={{fontSize:'0.8rem',color: thrMsg.includes('Error') ? '#ef4444' : '#22c55e',margin:'4px 0'}}>{thrMsg}</p>}
                  <button className="btn-primary" onClick={handleSaveThresholds} disabled={savingThr} style={{width:'100%',justifyContent:'center',marginTop:'0.5rem'}}>
                    {savingThr ? 'Guardando...' : 'Guardar Umbrales'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NetworksPage;