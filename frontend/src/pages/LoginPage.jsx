// En: frontend/src/pages/LoginPage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import './LoginPage.css';

const LOGO_URL = '/logo.png';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false); // <--- NUEVO: Estado de carga
  
  const navigate = useNavigate();
  // Asumo que tu contexto expone 'loginContext' para guardar los datos del usuario
  const { loginContext } = useAuth(); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true); // Bloqueamos el formulario

    try {
      // Enviamos credenciales al backend
      const response = await api.post('/api/auth/login', {
        username: username,
        password: password
      });
      
      // Si todo sale bien, guardamos en el contexto y redirigimos
      if (loginContext) {
          loginContext(response.data);
      }
      navigate('/dashboard'); 

    } catch (err) {
      console.error("Login error:", err);

      // --- MANEJO DE ERRORES DEL BACKEND ---
      if (err.response) {
        // 1. Rate Limiter (El backend devolvió 429)
        if (err.response.status === 429) {
            setError('⛔ Demasiados intentos. Acceso bloqueado temporalmente por seguridad.');
        } 
        // 2. Errores de Validación o Credenciales (El backend envió un mensaje)
        else if (err.response.data && err.response.data.message) {
            // A veces el mensaje viene como objeto en validaciones complejas
            const msg = typeof err.response.data.message === 'object' 
                ? JSON.stringify(err.response.data.message) 
                : err.response.data.message;
            setError(`⚠️ ${msg}`);
        } 
        // 3. Otros errores (404, 500 genérico)
        else {
            setError('Error en el servidor. Intente más tarde.');
        }
      } else {
        // 4. Error de Red (Backend apagado o sin internet)
        setError('🔌 No se pudo conectar con el servidor. Verifique su conexión.');
      }
    } finally {
        setIsLoading(false); // Desbloqueamos el formulario siempre
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-box">
        
        <img src={LOGO_URL} alt="CJ Traffic" className="login-logo" />

        <h1 className="login-title">Bienvenido</h1>
        <p className="login-subtitle">Sistema de Gestión de Tráfico</p>

        <form onSubmit={handleSubmit} className="login-form">
          
          {/* Input Usuario */}
          <div className="input-group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="input-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <input
              type="text"
              className="login-input"
              placeholder="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              disabled={isLoading} // Deshabilitar al cargar
            />
          </div>

          {/* Input Contraseña */}
          <div className="input-group">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="input-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <input
              type="password"
              className="login-input"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading} // Deshabilitar al cargar
            />
          </div>
          
          <button 
            type="submit" 
            className="login-button" 
            disabled={isLoading}
            style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'wait' : 'pointer' }}
          >
            {isLoading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
          
          {error && (
            <div className="login-error" style={{ color: '#d32f2f', marginTop: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Icono de error integrado en el mensaje */}
               {error}
            </div>
          )}

        </form>

        <div className="login-footer">
          <p>CJ Traffic Control © 2026</p>
          <p>Plataforma segura para gestión municipal y técnica.</p>
        </div>

      </div>
    </div>
  );
}

export default LoginPage;