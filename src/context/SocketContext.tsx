import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getCandidateBackendUrls, setApiBaseUrl } from '../utils/apiConfig';

interface SocketContextProps {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextProps>({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const candidates = getCandidateBackendUrls();
    let currentIdx = 0;
    let newSocket: Socket | null = null;
    let isMounted = true;

    const tryConnect = (index: number) => {
      if (!isMounted) return;
      if (index >= candidates.length) {
        setTimeout(() => {
          if (isMounted) tryConnect(0);
        }, 5000);
        return;
      }

      const targetUrl = candidates[index];
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.close();
      }

      newSocket = io(targetUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        timeout: 4000,
      });

      newSocket.on('connect', () => {
        if (!isMounted) return;
        setConnected(true);
        setSocket(newSocket);
        setApiBaseUrl(targetUrl);
      });

      newSocket.on('disconnect', () => {
        if (!isMounted) return;
        setConnected(false);
      });

      newSocket.on('connect_error', () => {
        if (!isMounted) return;
        if (!newSocket?.connected && currentIdx + 1 < candidates.length) {
          currentIdx++;
          tryConnect(currentIdx);
        }
      });

      setSocket(newSocket);
    };

    tryConnect(0);

    return () => {
      isMounted = false;
      if (newSocket) {
        newSocket.close();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
