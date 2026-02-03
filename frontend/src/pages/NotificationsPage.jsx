// En: frontend/src/pages/NotificationsPage.jsx

import React, { useMemo } from 'react';
import { useNotifications } from '../context/NotificationContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale'; // Asegúrate de tener date-fns instalado
import './NotificationsPage.css';

// Componente de Icono con Fondo
const NotificationIcon = ({ type }) => {
    let icon = '🔔';
    let bgClass = 'bg-icon-gray'; 
    
    switch(type) {
        case 'status_change': 
            icon = '🚨'; bgClass = 'bg-icon-red'; break; // Falla Critica
        case 'new_ticket': 
            icon = '🎫'; bgClass = 'bg-icon-blue'; break; // Nuevo Ticket
        case 'ticket_update': 
            icon = '🛠️'; bgClass = 'bg-icon-yellow'; break; // Actualización
        case 'event_due': 
            icon = '✅'; bgClass = 'bg-icon-green'; break; // Mantenimiento
        default: 
            icon = '💬'; bgClass = 'bg-icon-gray';
    }
    
    return (
        <div className={`notification-icon-box ${bgClass}`}>
            {icon}
        </div>
    );
};

function NotificationsPage() {
    const { 
        notifications, 
        loading, 
        markAsRead, 
        clearReadNotifications 
    } = useNotifications();
    const { user } = useAuth();

    // Ordenar: No leídas primero, luego por fecha
    const sortedNotifications = useMemo(() => {
        return [...notifications].sort((a, b) => {
            if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [notifications]);
    
    const readCount = notifications.filter(n => n.isRead).length;
    const unreadCount = notifications.length - readCount;

    const handleMarkAllAsRead = () => {
        notifications.filter(n => !n.isRead).forEach(n => markAsRead(n._id));
    };

    return (
        <div className="page-content notifications-page">
            
            <div className="page-header">
                <h2 className="page-title">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:'32px', color:'#ff9900'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                    Centro de Notificaciones
                </h2>
                <p className="page-subtitle">Mantente al día con las últimas alertas del sistema.</p>
            </div>
            
            <div className="notifications-card">
                
                {/* BARRA DE ACCIONES */}
                <div className="notifications-actions-bar">
                    <div className="stats-text">
                        Tienes <span className="stats-highlight" style={{color: unreadCount > 0 ? '#ef4444' : '#64748b'}}>{unreadCount}</span> nuevas notificaciones
                    </div>
                    
                    <div className="actions-group">
                        <button 
                            className="btn-action btn-mark-all"
                            onClick={handleMarkAllAsRead}
                            disabled={unreadCount === 0}
                            title="Marcar todas como leídas"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:'16px'}}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            Marcar Todo
                        </button>
                        
                        <button 
                            className="btn-action btn-clear-read"
                            onClick={clearReadNotifications}
                            disabled={readCount === 0}
                            title="Eliminar notificaciones leídas"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:'16px'}}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                            Limpiar Leídas
                        </button>
                    </div>
                </div>

                {/* LISTA DE ITEMS */}
                <div className="notification-list-container">
                    {loading && <p className="loading-message">Cargando notificaciones...</p>}
                    
                    {!loading && notifications.length === 0 && (
                        <div className="empty-state">
                            <div className="empty-icon">🎉</div>
                            <span className="empty-text">¡Estás al día! No hay notificaciones recientes.</span>
                        </div>
                    )}
                    
                    {!loading && sortedNotifications.map(n => (
                        <div 
                            key={n._id} 
                            className={`notification-item ${n.isRead ? 'read' : 'unread'}`}
                            onClick={() => !n.isRead && markAsRead(n._id)}
                        >
                            <NotificationIcon type={n.type} />
                            
                            <div className="notification-content">
                                <div className="notification-title">{n.title}</div>
                                <p className="notification-message">{n.message}</p>
                                <div className="notification-date">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{width:'14px'}}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {format(new Date(n.createdAt), 'dd MMM yyyy, HH:mm', { locale: es })}
                                </div>
                            </div>
                            
                            {!n.isRead && <span className="unread-dot" title="No leída"></span>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default NotificationsPage;