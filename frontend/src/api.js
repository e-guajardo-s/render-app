// En: frontend/src/api.js
import axios from 'axios';

// 1. Crea la instancia centralizada
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL|| '/api', // Usa la variable de entorno
});

// 2. Interceptor de Petición (Request): Añade el token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3. Interceptor de Respuesta (Response): Maneja la expiración del token
api.interceptors.response.use(
  (response) => response, // Si todo ok, devuelve la respuesta
  (error) => {
    // Si el token expiró o no es válido (error 401)
    if (error.response && error.response.status === 401) {
      // Limpia el storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirige al login (forzando recarga)
      window.location.href = '/login';
      return Promise.reject(new Error('Sesión expirada. Redirigiendo...'));
    }
    // Devuelve otros errores
    return Promise.reject(error);
  }
);

export default api;