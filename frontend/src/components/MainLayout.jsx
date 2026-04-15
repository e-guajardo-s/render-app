// frontend/src/components/MainLayout.jsx
// FIX: Se eliminó el NotificationProvider duplicado.
// El proveedor ya existe en App.jsx (nivel superior).
// Tenerlo dos veces creaba un contexto nuevo que ignoraba las notificaciones
// cargadas en el padre.

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api.js';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';
import './MainLayout.css';
import { io } from 'socket.io-client';

// Misma lógica que NotificationContext para construir la URL del socket
const getSocketUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) return window.location.origin;
  return base.replace(/\/api\/?$/, '');
};

function MainLayout() {
  const { user, logoutContext } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mapInstance, setMapInstance]     = useState(null);
  const [semaphores, setSemaphores]       = useState([]);
  const [mapLoading, setMapLoading]       = useState(true);
  const [mapError, setMapError]           = useState('');
  const [socket, setSocket]               = useState(null);

  useEffect(() => {
    if (!user) return;

    // Cargar semáforos para el mapa del dashboard
    const fetchSemaphores = async () => {
      setMapLoading(true);
      setMapError('');
      try {
        const response = await api.get('/api/semaphores');
        setSemaphores(Array.isArray(response.data) ? response.data : []);
      } catch (err) {
        setMapError(err.response?.data?.message || 'Error al cargar datos.');
        setSemaphores([]);
      } finally {
        setMapLoading(false);
      }
    };

    fetchSemaphores();

    // Conectar socket para actualizaciones en tiempo real del mapa
    const socketUrl = getSocketUrl();
    const newSocket = io(socketUrl, {
      transports: import.meta.env.PROD ? ['websocket'] : ['polling', 'websocket'],
      withCredentials: true,
    });

    newSocket.on('connect', () => console.log('Socket.IO conectado'));

    newSocket.on('status_update', ({ cruceId, isOnline, fullStatus }) => {
      setSemaphores(current =>
        current.map(sem =>
          sem.cruceId === cruceId
            ? { ...sem, status: fullStatus, isOnline }
            : sem
        )
      );
    });

    setSocket(newSocket);
    return () => { newSocket.disconnect(); setSocket(null); };
  }, [user]);

  if (!user) return <div>Cargando...</div>;

  return (
    <div className="main-layout-container">
      {/* Header */}
      <div className="main-header-area">
        <Header
          user={user}
          onLogout={() => { logoutContext(); navigate('/login'); }}
          onMenuClick={() => setIsSidebarOpen(s => !s)}
          semaphores={semaphores}
          map={mapInstance}
        />
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          user={user}
        />
      </div>

      {/* Contenido principal */}
      <main className="main-content-area">
        <Outlet context={{
          semaphores,
          mapLoading,
          mapError,
          onMapReady: setMapInstance,
          socket,
        }} />
      </main>

      {/* Footer */}
      <footer className="main-footer-area">
        © 2026&nbsp;
        <a
          href="https://cjtraffic.cl/"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#ff9900', textDecoration: 'none', fontWeight: 'bold' }}
        >
          CJ Traffic SMART
        </a>
        &nbsp;&mdash; Sistema de Monitoreo Automatizado en Red de Tráfico
      </footer>
    </div>
  );
}

export default MainLayout;
