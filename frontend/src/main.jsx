// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // <--- IMPORTAR
import App from './App';
import './index.css';

// Crear una instancia del cliente de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Evita recargar datos solo por cambiar de pestaña
      retry: 1, // Reintentar 1 vez si falla la petición
      staleTime: 1000 * 60 * 5, // Considerar datos "frescos" por 5 minutos (ajustable)
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Envolver la App con el Provider */}
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);