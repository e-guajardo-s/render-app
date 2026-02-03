// En: frontend/src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api'; // <-- Importa tu API centralizada

// 1. Creamos el Contexto
const AuthContext = createContext();

// 2. Creamos el "Proveedor" del contexto
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Para saber si estamos cargando datos

  // 3. useEffect para cargar el token desde localStorage al iniciar la app
  useEffect(() => {
    const storedToken = localStorage.getItem('token');

    if (!storedToken) {
        setIsLoading(false);
        return;
    }

    // --- LÓGICA DE VALIDACIÓN MODIFICADA ---
    const validateToken = async () => {
        try {
            // El interceptor de 'api' ya añade el token al header
            const response = await api.get('/api/auth/me'); 

            // Sincroniza el usuario con datos frescos del backend
            const userData = response.data;
            setUser({ username: userData.username, role: userData.role });
            setToken(storedToken);

            // Actualiza localStorage por si el rol cambió
            localStorage.setItem('user', JSON.stringify({ username: userData.username, role: userData.role }));

        } catch (error) {
            // El interceptor (error 401) ya limpia el storage y redirige
            // Por si acaso, limpiamos aquí también
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    validateToken();
    // -------------------------------------

  }, []);

  // 4. Función de Login: guarda el token y usuario en el estado Y en localStorage
  const loginContext = (data) => {
    const { token, username, role } = data;
    const userData = { username, role };
    
    setToken(token);
    setUser(userData);
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  // 5. Función de Logout: limpia todo
  const logoutContext = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // 6. Proveemos los valores a todos los "hijos"
  return (
    <AuthContext.Provider value={{ token, user, isLoading, loginContext, logoutContext }}>
      {children}
    </AuthContext.Provider>
  );
};

// 7. Creamos un "hook" personalizado para usar el contexto fácilmente
export const useAuth = () => {
  return useContext(AuthContext);
};