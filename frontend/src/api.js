// En: frontend/src/api.js
import axios from 'axios';

// 1. Crea la instancia centralizada
const api = axios.create({
  // TRUCO: Si estamos en Producción (Render), usa URL relativa ('').
  // Si estamos en Desarrollo (Local), usa la variable de entorno (localhost).
  baseURL: import.meta.env.PROD ? '' : import.meta.env.VITE_API_BASE_URL,
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
  (response) => response, 
  (error) => {
    // Si el token expiró o no es válido (error 401)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Sesión expirada. Redirigiendo...'));
    }
    return Promise.reject(error);
  }
);

export default api;