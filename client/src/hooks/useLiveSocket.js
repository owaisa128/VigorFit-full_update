import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Socket server = same host as the API (strip the trailing /api). Override with VITE_SOCKET_URL if needed.
const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL
  || import.meta.env.VITE_API_URL
  || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const EVENTS = ['gps:started', 'gps:update', 'gps:status', 'gps:ended', 'goal:assigned'];

/**
 * Free real-time connection (Socket.io). Pass handlers like { 'gps:update': fn }.
 * Returns true while connected, so pages can fall back to polling when it is false.
 */
export default function useLiveSocket(handlers = {}) {
  const handlersRef = useRef(handlers);
  const [connected, setConnected] = useState(false);

  useEffect(() => { handlersRef.current = handlers; });

  useEffect(() => {
    const token = localStorage.getItem('fittrack_token');
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, reconnectionDelayMax: 10000 });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    EVENTS.forEach((event) => socket.on(event, (payload) => handlersRef.current[event]?.(payload)));
    return () => { socket.removeAllListeners(); socket.disconnect(); };
  }, []);

  return connected;
}
