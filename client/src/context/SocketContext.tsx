'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS, TimePongPayload } from 'agla-station-shared';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  serverOffset: number; // Offset to add to local Date.now() to get server epoch ms
  getServerNow: () => number;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  serverOffset: 0,
  getServerNow: () => Date.now(),
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serverOffset, setServerOffset] = useState<number>(0);
  const offsetRef = useRef<number>(0);

  useEffect(() => {
    const configuredServerUrl = process.env.NEXT_PUBLIC_SERVER_URL?.trim();
    const serverUrl =
      configuredServerUrl ||
      `${window.location.protocol}//${window.location.hostname}:4000`;
    const s = io(serverUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setIsConnected(true);
      // Perform NTP-style ping-pong to synchronize clocks
      const clientSendTime = Date.now();
      s.emit(SOCKET_EVENTS.TIME_PING, { clientSendTime });
    });

    s.on(SOCKET_EVENTS.TIME_PONG, (pong: TimePongPayload) => {
      const clientRecvTime = Date.now();
      const rtt = clientRecvTime - pong.clientSendTime;
      // Clock offset = serverTime + (RTT / 2) - clientRecvTime
      const offset = pong.serverTime + rtt / 2 - clientRecvTime;
      offsetRef.current = offset;
      setServerOffset(offset);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(s);

    // Periodically re-estimate clock offset every 60s
    const clockInterval = setInterval(() => {
      if (s.connected) {
        s.emit(SOCKET_EVENTS.TIME_PING, { clientSendTime: Date.now() });
      }
    }, 60000);

    return () => {
      clearInterval(clockInterval);
      s.disconnect();
    };
  }, []);

  const getServerNow = () => Date.now() + offsetRef.current;

  return (
    <SocketContext.Provider value={{ socket, isConnected, serverOffset, getServerNow }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
