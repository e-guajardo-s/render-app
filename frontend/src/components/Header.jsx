// En: frontend/src/components/Header.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import debounce from 'lodash.debounce';
import api from '../api.js';
import { useNotifications } from '../context/NotificationContext.jsx';
import './Header.css';

const LOGO_URL = '/logo.png';

// Icono Campana
const BellIcon = ({ hasUnread }) => (
    <div className="notification-icon-wrapper">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="bell-svg">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {hasUnread > 0 && <span className="notification-badge">{hasUnread > 9 ? '9+' : hasUnread}</span>}
    </div>
);

function Header({ user, onLogout, onMenuClick, map }) { 
  const navigate = useNavigate();
  const location = useLocation();

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  
  const userDropdownRef = useRef(null);
  const userButtonRef = useRef(null);
  const notifDropdownRef = useRef(null);
  const notifButtonRef = useRef(null);
  const searchContainerRef = useRef(null);

  const { unreadCount, notifications, loading: loadingNotifs } = useNotifications(); 
  const showSearchBar = location.pathname === '/dashboard';

  // Título de la página
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'DASHBOARD';
      case '/admin': return 'ADMINISTRACIÓN';
      case '/semaphores': return 'SEMÁFOROS';
      case '/reports': return 'REPORTES';
      case '/status': return 'ESTADOS';
      case '/documentacion': return 'DOCUMENTACIÓN';
      case '/tickets': return 'SOPORTE';
      case '/calendar': return 'CALENDARIO';
      case '/networks': return 'REDES IOT';
      case '/notifications': return 'NOTIFICACIONES';
      case '/audit':         return 'AUDITORÍA';
      case '/profile':       return 'MI PERFIL';
      case '/compare':       return 'COMPARATIVA';
      default: return 'SISTEMA';
    }
  };

  const toggleUserDropdown = () => setIsUserDropdownOpen(!isUserDropdownOpen);
  const toggleNotifDropdown = () => setIsNotifDropdownOpen(!isNotifDropdownOpen);

  // Rol legible
  const getDisplayRole = (role) => {
    if (role === 'superadmin') return 'Super Admin';
    if (role === 'admin') return 'Administrador';
    if (role === 'municipalidad') return 'Municipalidad';
    if (role === 'user') return 'Técnico';
    return role;
  };

  // Búsqueda
  const fetchSearchResults = useCallback(
    debounce(async (term) => {
      if (term && term.trim().length > 1) {
        try {
          const response = await api.get(`/api/semaphores/search?q=${term}`);
          setFilteredResults(response.data);
        } catch (error) { setFilteredResults([]); }
      } else { setFilteredResults([]); }
    }, 300), []
  );

  useEffect(() => { fetchSearchResults(searchTerm); }, [searchTerm, fetchSearchResults]);

  // Click Outside
  useEffect(() => {
    function handleClickOutside(event) {
        if (isUserDropdownOpen && userDropdownRef.current && !userDropdownRef.current.contains(event.target) && !userButtonRef.current.contains(event.target)) setIsUserDropdownOpen(false);
        if (isNotifDropdownOpen && notifDropdownRef.current && !notifDropdownRef.current.contains(event.target) && !notifButtonRef.current.contains(event.target)) setIsNotifDropdownOpen(false);
        if (filteredResults.length > 0 && searchContainerRef.current && !searchContainerRef.current.contains(event.target)) setFilteredResults([]);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserDropdownOpen, isNotifDropdownOpen, filteredResults]);

  const handleResultClick = (sem) => {
      if (map && sem.coordenadas?.lat) {
          map.setView([sem.coordenadas.lat, sem.coordenadas.lng], 17, { animate: true });
          setSearchTerm(''); setFilteredResults([]);
      } else { alert('Sin coordenadas.'); }
  };

  const displayNotifs = (notifications && notifications.length > 0) ? notifications : [
      { _id: 'sys', title: 'Sistema Listo', message: 'Bienvenido a CJ Traffic SMART.', type: 'info' }
  ];

  return (
    <header className="header-container">
      {/* IZQUIERDA */}
      <div className="header-nav">
        <button className="menu-button" onClick={onMenuClick}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:'24px', height:'24px'}}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
        </button>
        <Link to="/dashboard" className="brand-link">
            <img src={LOGO_URL} alt="CJ Traffic" className="brand-logo" />
            <div className="brand-text-block">
                <div className="brand-main">CJ Traffic <span className="brand-accent">SMART</span></div>
                <div className="brand-subtitle">{getPageTitle()}</div>
            </div>
        </Link>
      </div>

      {/* CENTRO (Búsqueda) */}
      {showSearchBar ? (
        <div className="header-search" ref={searchContainerRef}>
          <div className="search-bar-wrapper">
             <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
             </svg>
             <input type="text" placeholder="Buscar Cruce, ID o Zona..." className="search-input" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          {filteredResults.length > 0 && (
            <div className="search-results-container">
              {filteredResults.map(sem => (
                <div key={sem._id} className="search-result-item" onClick={() => handleResultClick(sem)}>
                  <div className="result-icon-wrapper">🚦</div>
                  <div className="result-text-wrapper">
                      <p className="search-result-title">{sem.cruce || 'Sin Nombre'}</p>
                      <p className="search-result-subtitle">ID: {sem.cruceId} • {sem.comuna}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : <div style={{flex:2}}></div>}

      {/* DERECHA */}
      <div className="header-user">
        
        {/* Notificaciones */}
        <div style={{position: 'relative'}}>
            <button className={`notification-button-wrapper ${isNotifDropdownOpen ? 'active' : ''}`} onClick={toggleNotifDropdown} ref={notifButtonRef}>
                <BellIcon hasUnread={unreadCount} />
            </button>
            {isNotifDropdownOpen && (
                <div className="notification-dropdown" ref={notifDropdownRef}>
                    <div className="notif-dropdown-header">
                        <span>Notificaciones</span>
                        {unreadCount > 0 && <span style={{background:'#fee2e2', color:'#ef4444', padding:'2px 8px', borderRadius:'10px', fontSize:'0.7rem'}}>{unreadCount} nuevas</span>}
                    </div>
                    <div style={{maxHeight:'300px', overflowY:'auto'}}>
                        {displayNotifs.slice(0, 5).map((notif, idx) => (
                            <div key={idx} className="notif-dropdown-item" style={{display:'flex', gap:'10px'}}>
                                <div style={{width:'8px', height:'8px', borderRadius:'50%', background: notif.type==='critical'?'#ef4444':'#3b82f6', marginTop:'6px', flexShrink:0}}></div>
                                <div className="notif-info">
                                    <strong>{notif.title}</strong>
                                    <p>{notif.message}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="notif-view-all" onClick={() => navigate('/notifications')}>Ver Todas</button>
                </div>
            )}
        </div>

        {/* --- USUARIO (ARREGLADO) --- */}
        <div style={{position: 'relative'}}>
            <button onClick={toggleUserDropdown} className="user-icon-button" ref={userButtonRef}>
              <div className="user-avatar-circle">{user.username.charAt(0).toUpperCase()}</div>
            </button>
            
            {isUserDropdownOpen && (
              <div className="user-dropdown" ref={userDropdownRef}>
                <div className="dropdown-user-info">
                  {/* Se usa getDisplayRole para mostrar 'Administrador' en vez de 'admin' */}
                  <span className="dropdown-username">{user.username}</span>
                  <span className="dropdown-role">{getDisplayRole(user.role)}</span>
                </div>
                <button onClick={onLogout} className="dropdown-logout">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{width:'18px'}}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                    </svg>
                    Cerrar Sesión
                </button>
              </div>
            )}
        </div>
      </div>
    </header>
  );
}

export default Header;