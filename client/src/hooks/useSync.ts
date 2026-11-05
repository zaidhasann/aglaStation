'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  SOCKET_EVENTS,
  RoomStatePayload,
  StationAdvancePayload,
  RoomResyncPayload,
  PresenceUpdatePayload,
  Track,
  Station,
  Direction,
} from 'agla-station-shared';

export interface UseSyncOptions {
  lineId: string;
  direction: Direction;
  startStationId: string;
  destStationId: string;
  userName?: string;
  onStationAdvance?: (current: Station, next: Station | null) => void;
}

export function useSync(options: UseSyncOptions) {
  const { socket, isConnected, getServerNow } = useSocket();
  const [roomState, setRoomState] = useState<RoomStatePayload | null>(null);
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [nextStation, setNextStation] = useState<Station | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [stationIndex, setStationIndex] = useState<number>(0);
  const [listenersCount, setListenersCount] = useState<number>(1);
  const [stationCounts, setStationCounts] = useState<Record<string, number>>({});
  const [hasJoined, setHasJoined] = useState(false);

  // Reference to track epoch startedAt to avoid stale state in timers
  const startedAtRef = useRef<number>(0);
  const trackRef = useRef<Track | null>(null);

  // Calculate target seek position in seconds based on server epoch
  const computeTargetSeek = useCallback((): number => {
    if (!startedAtRef.current) return 0;
    const serverNow = getServerNow();
    const elapsedSec = Math.max(0, (serverNow - startedAtRef.current) / 1000);
    const duration = trackRef.current?.durationSec;

    if (duration && duration > 0) {
      return elapsedSec % duration;
    }
    return elapsedSec;
  }, [getServerNow]);

  // Join room when connected
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit(SOCKET_EVENTS.ROOM_JOIN, {
      lineId: options.lineId,
      direction: options.direction,
      startStationId: options.startStationId,
      destStationId: options.destStationId,
      name: options.userName,
    });
    setHasJoined(true);
  }, [socket, isConnected, options.lineId, options.direction, options.startStationId, options.destStationId, options.userName]);

  // Listen for room updates
  useEffect(() => {
    if (!socket) return;

    const handleRoomState = (state: RoomStatePayload) => {
      setRoomState(state);
      setStationIndex(state.stationIndex);
      setCurrentStation(state.currentStation);
      setNextStation(state.nextStation);
      setTrack(state.track);
      setListenersCount(state.listenersCount);
      setStationCounts(state.stationCounts);
      startedAtRef.current = state.startedAt;
      trackRef.current = state.track;
    };

    const handleStationAdvance = (advance: StationAdvancePayload) => {
      setStationIndex(advance.stationIndex);
      setCurrentStation(advance.currentStation);
      setNextStation(advance.nextStation);
      setTrack(advance.track);
      startedAtRef.current = advance.startedAt;
      trackRef.current = advance.track;

      if (options.onStationAdvance) {
        options.onStationAdvance(advance.currentStation, advance.nextStation);
      }
    };

    const handleRoomResync = (resync: RoomResyncPayload) => {
      setStationIndex(resync.stationIndex);
      setTrack(resync.track);
      startedAtRef.current = resync.startedAt;
      trackRef.current = resync.track;
    };

    const handlePresence = (presence: PresenceUpdatePayload) => {
      setListenersCount(presence.listenersCount);
      setStationCounts(presence.stationCounts);
    };

    socket.on(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
    socket.on(SOCKET_EVENTS.STATION_ADVANCE, handleStationAdvance);
    socket.on(SOCKET_EVENTS.ROOM_RESYNC, handleRoomResync);
    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresence);

    // Periodic 30-second re-sync trigger to ensure alignment
    const resyncInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.ROOM_RESYNC);
      }
    }, 30000);

    return () => {
      clearInterval(resyncInterval);
      socket.off(SOCKET_EVENTS.ROOM_STATE, handleRoomState);
      socket.off(SOCKET_EVENTS.STATION_ADVANCE, handleStationAdvance);
      socket.off(SOCKET_EVENTS.ROOM_RESYNC, handleRoomResync);
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresence);
    };
  }, [socket, options]);

  // Manual advance helper for dev and UI trigger
  const advanceStation = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.STATION_ADVANCE_MANUAL);
    }
  }, [socket]);

  return {
    roomState,
    currentStation,
    nextStation,
    track,
    stationIndex,
    listenersCount,
    stationCounts,
    computeTargetSeek,
    advanceStation,
    isConnected,
    hasJoined,
  };
}
