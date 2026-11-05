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
  Sponsor,
} from 'agla-station-shared';

export interface UseSyncOptions {
  lineId: string;
  direction: Direction;
  startStationId: string;
  destStationId: string;
  userName?: string;
  onStationAdvance?: (current: Station, next: Station | null) => void;
  onDestinationReached?: (destStation: Station) => void;
}

export function useSync(options: UseSyncOptions) {
  const { socket, isConnected, getServerNow } = useSocket();
  const [roomState, setRoomState] = useState<RoomStatePayload | null>(null);
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [nextStation, setNextStation] = useState<Station | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [stationIndex, setStationIndex] = useState<number>(0);
  const [interstationSec, setInterstationSec] = useState<number>(120);
  const [listenersCount, setListenersCount] = useState<number>(1);
  const [stationCounts, setStationCounts] = useState<Record<string, number>>({});
  const [hasJoined, setHasJoined] = useState(false);
  const [isDestinationReached, setIsDestinationReached] = useState(false);
  const [currentSponsor, setCurrentSponsor] = useState<Sponsor | null>(null);

  // Reference to track epoch startedAt to avoid stale state in timers
  const startedAtRef = useRef<number>(0);
  const trackRef = useRef<Track | null>(null);

  // Calculate target seek position in seconds based on server epoch & track offsets
  const computeTargetSeek = useCallback((): number => {
    if (!startedAtRef.current) return 0;
    const serverNow = getServerNow();
    const elapsedSec = Math.max(0, (serverNow - startedAtRef.current) / 1000);
    const startOffset = trackRef.current?.startOffsetSec || 0;
    const playWindow = trackRef.current?.playSec || trackRef.current?.durationSec || 120;

    // Loop cleanly within segment if track is shorter than interstation interval
    return startOffset + (elapsedSec % playWindow);
  }, [getServerNow]);

  const { destStationId, onDestinationReached } = options;

  // Check destination arrival
  const checkDestination = useCallback(
    (station: Station | null) => {
      if (!station || !destStationId) return;
      if (station.id === destStationId) {
        setIsDestinationReached(true);
        if (onDestinationReached) {
          onDestinationReached(station);
        }
      }
    },
    [destStationId, onDestinationReached]
  );

  // Join room on mount or config change
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

    return () => {
      if (socket.connected) {
        socket.emit(SOCKET_EVENTS.ROOM_LEAVE);
      }
      setHasJoined(false);
    };
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
      setCurrentSponsor(state.sponsor || null);
      if (state.interstationSec) setInterstationSec(state.interstationSec);
      startedAtRef.current = state.startedAt;
      trackRef.current = state.track;

      checkDestination(state.currentStation);
    };

    const handleStationAdvance = (advance: StationAdvancePayload) => {
      setStationIndex(advance.stationIndex);
      setCurrentStation(advance.currentStation);
      setNextStation(advance.nextStation);
      setTrack(advance.track);
      setCurrentSponsor(advance.sponsor || null);
      if (advance.interstationSec) setInterstationSec(advance.interstationSec);
      startedAtRef.current = advance.startedAt;
      trackRef.current = advance.track;

      checkDestination(advance.currentStation);

      if (options.onStationAdvance) {
        options.onStationAdvance(advance.currentStation, advance.nextStation);
      }
    };

    const handleRoomResync = (resync: RoomResyncPayload) => {
      setStationIndex(resync.stationIndex);
      setTrack(resync.track);
      if (resync.sponsor !== undefined) setCurrentSponsor(resync.sponsor);
      if (resync.interstationSec) setInterstationSec(resync.interstationSec);
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
  }, [socket, options, checkDestination]);

  // Report embed playback error to server for automatic fallback
  const reportTrackError = useCallback((errorMsg?: string) => {
    if (socket && socket.connected && trackRef.current) {
      socket.emit(SOCKET_EVENTS.TRACK_ERROR, {
        sourceId: trackRef.current.sourceId,
        stationId: currentStation?.id,
        lineId: options.lineId,
        error: errorMsg,
      });
    }
  }, [socket, currentStation, options.lineId]);

  // Manual advance helper for dev and UI trigger
  const advanceStation = useCallback(() => {
    if (socket && socket.connected) {
      socket.emit(SOCKET_EVENTS.STATION_ADVANCE_MANUAL);
    }
  }, [socket]);

  // Track sponsor aggregate events
  const emitSponsorAction = useCallback(
    (sponsorId: string, stationId: string, action: 'impression' | 'dismiss' | 'tap') => {
      if (socket && socket.connected) {
        socket.emit(SOCKET_EVENTS.SPONSOR_EVENT, { sponsorId, stationId, action });
      }
    },
    [socket]
  );

  return {
    roomState,
    currentStation,
    nextStation,
    track,
    stationIndex,
    interstationSec,
    listenersCount,
    stationCounts,
    currentSponsor,
    emitSponsorAction,
    computeTargetSeek,
    advanceStation,
    reportTrackError,
    isDestinationReached,
    setIsDestinationReached,
    isConnected,
    hasJoined,
  };
}
