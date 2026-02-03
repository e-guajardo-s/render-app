// frontend/src/context/NotificationContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api';
import { useAuth } from './AuthContext';
import { io } from 'socket.io-client'; // <--- IMPORTANTE: Usamos io directo

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user, token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // --- 1. CARGA INICIAL (Historial) ---
    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const { data } = await api.get('/api/notifications');
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.isRead).length);
        } catch (error) {
            console.error("Error cargando notificaciones:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // --- 2. CONEXIÓN REAL-TIME INDEPENDIENTE ---
    useEffect(() => {
        // Solo conectamos si hay usuario logueado
        if (!token || !user) {
            setNotifications([]);
            return;
        }

        fetchNotifications(); // Cargar historial inicial

        // A. Conectar Socket
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const socketUrl = baseUrl.replace('/api', '');
        const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

        // B. Escuchar evento (Nombre correcto: 'new_notification')
        socket.on('new_notification', (newNotif) => {
            console.log("🔔 Nueva notificación recibida por Socket:", newNotif);

            // C. Filtrado de Seguridad (Para que un técnico no vea alertas de otra comuna)
            const isForMe = 
                (newNotif.targetRole === 'superadmin') || // Superadmin ve todo
                (newNotif.targetRole === 'admin' && user.role === 'admin') ||
                (newNotif.targetRole === 'municipalidad' && user.role === 'municipalidad' && newNotif.targetComuna === user.comuna) ||
                (newNotif.targetRole === 'user' && user.role === 'user');

            if (isForMe || user.role === 'superadmin') {
                setNotifications(prev => [newNotif, ...prev]);
                setUnreadCount(prev => prev + 1);
                
                // (Opcional) Reproducir sonido
                try {
                    const audio = new Audio('/notification.mp3'); 
                    audio.play().catch(() => {});
                } catch(e) {}
            }
        });

        // D. Limpieza al salir
        return () => {
            socket.disconnect();
        };
    }, [token, user, fetchNotifications]);


    // --- 3. ACCIONES (Marcar Leída / Borrar) ---
    const markAsRead = async (id) => {
        try {
            await api.put(`/api/notifications/${id}/read`);
            
            // Actualización Optimista (Visualmente instantáneo)
            setNotifications(prev => prev.map(n => 
                n._id === id ? { ...n, isRead: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marcando leída", error);
            fetchNotifications(); // Si falla, recargamos real
        }
    };

    const clearReadNotifications = async () => {
        try {
            await api.delete('/api/notifications/clear-read'); // Asegúrate que esta ruta exista en backend
            setNotifications(prev => prev.filter(n => !n.isRead));
        } catch (error) {
            console.error("Error borrando leídas:", error);
        }
    };

    return (
        <NotificationContext.Provider value={{ 
            notifications, 
            unreadCount, 
            loading,
            fetchNotifications,
            markAsRead,
            clearReadNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => useContext(NotificationContext);