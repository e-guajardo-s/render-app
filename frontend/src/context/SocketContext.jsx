// frontend/src/context/SocketContext.jsx
// Socket ÚNICO compartido por toda la app — evita múltiples conexiones TCP a AWS
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const getSocketUrl = () => {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (!base) return window.location.origin;
  return base.replace(/\/api\/?$/, '');
};

export const SocketProvider = ({ children }) => {
  const { token } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Si ya hay socket conectado, no crear otro
    if (socketRef.current?.connected) return;

    const s = io(getSocketUrl(), {
      transports: import.meta.env.PROD ? ['websocket'] : ['polling', 'websocket'],
      withCredentials: true,
      // Reconexión automática con backoff exponencial — no martillea el servidor
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 10,
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
