// frontend/src/context/NotificationContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user, token } = useAuth();
  const socket = useSocket(); // Socket compartido — no crea conexión nueva
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);

  // ── 1. Cargar historial desde el backend ──────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data } = await api.get('/api/notifications');
      setNotifications(data);
    } catch (error) {
      console.error('Error cargando notificaciones:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mantener el contador sincronizado con el array
  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.isRead).length);
  }, [notifications]);

  // ── 2. Carga inicial al autenticarse ──────────────────────────
  useEffect(() => {
    if (!token || !user) { setNotifications([]); return; }
    fetchNotifications();
  }, [token, user, fetchNotifications]);

  // ── 3. Escuchar notificaciones via socket compartido ──────────
  useEffect(() => {
    if (!socket || !user) return;

    const onIncomingNotification = () => {
      fetchNotifications();
      try { new Audio('/notification.mp3').play().catch(() => {}); } catch (_) {}
    };

    socket.on('new_notification', onIncomingNotification);
    return () => { socket.off('new_notification', onIncomingNotification); };
  }, [socket, user, fetchNotifications]);

  // ── 4. Acciones ────────────────────────────────────────────────
  const markAsRead = async (id) => {
    const target = notifications.find(n => n._id === id);
    if (!target || target.isRead) return;
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (error) {
      console.error('Error marcando leída', error);
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    const hasUnread = notifications.some(n => !n.isRead);
    if (!hasUnread) return;
    const previous = notifications;
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await api.put('/api/notifications/read-all');
    } catch (error) {
      console.error('Error marcando todas como leídas:', error);
      setNotifications(previous);
      fetchNotifications();
    }
  };

  const clearReadNotifications = async () => {
    try {
      await api.delete('/api/notifications/clear-read');
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch (error) {
      console.error('Error borrando leídas:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
      clearReadNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
