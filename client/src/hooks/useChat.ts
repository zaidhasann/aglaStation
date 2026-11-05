'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';
import {
  SOCKET_EVENTS,
  PresenceUpdatePayload,
  PresenceRider,
  ChatRequestPayload,
  ChatAcceptPayload,
  ChatMessagePayload,
  ChatEndPayload,
} from 'agla-station-shared';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  text: string;
  timestamp: number;
  isSelf: boolean;
}

export interface ActiveConversation {
  chatId: string;
  partnerId: string;
  partnerName: string;
  messages: ChatMessage[];
  unreadCount: number;
}

export function useChat() {
  const { socket } = useSocket();

  // Multi-session conversations: chatId -> ActiveConversation
  const [conversations, setConversations] = useState<Record<string, ActiveConversation>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Request states
  const [incomingRequest, setIncomingRequest] = useState<ChatRequestPayload | null>(null);
  const [outgoingRequestTarget, setOutgoingRequestTarget] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Pending outbound partner tracking (targetId -> targetName)
  const pendingOutgoingRef = useRef<{ id: string; name: string } | null>(null);

  // Blocked users
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  // Room presence list of riders
  const [roomRiders, setRoomRiders] = useState<PresenceRider[]>([]);
  const roomRidersRef = useRef<PresenceRider[]>([]);
  roomRidersRef.current = roomRiders;

  const activeChatIdRef = useRef<string | null>(null);
  activeChatIdRef.current = activeChatId;

  useEffect(() => {
    if (!socket) return;

    // 1. Presence update
    const handlePresence = (payload: PresenceUpdatePayload) => {
      setRoomRiders(payload.riders.filter((r) => r.id !== socket.id));
    };

    // 2. Incoming chat request
    const handleChatRequest = (payload: ChatRequestPayload) => {
      if (blockedUserIds.has(payload.fromUserId)) return;
      setIncomingRequest(payload);
    };

    // 3. Chat accepted -> add or activate conversation session
    const handleChatAccept = (payload: ChatAcceptPayload) => {
      setIncomingRequest(null);
      setOutgoingRequestTarget(null);

      let partnerId = '';
      let partnerName = 'Co-Rider';

      // If we initiated
      if (pendingOutgoingRef.current) {
        partnerId = pendingOutgoingRef.current.id;
        partnerName = pendingOutgoingRef.current.name;
        pendingOutgoingRef.current = null;
      } else {
        // Fallback: lookup from known room riders
        const found = roomRidersRef.current.find((r) => r.id !== socket.id);
        if (found) {
          partnerId = found.id;
          partnerName = found.name;
        }
      }

      setConversations((prev) => {
        const existing = prev[payload.chatId];
        return {
          ...prev,
          [payload.chatId]: {
            chatId: payload.chatId,
            partnerId: existing?.partnerId || partnerId,
            partnerName: existing?.partnerName || partnerName,
            messages: existing?.messages || [],
            unreadCount: 0,
          },
        };
      });

      setActiveChatId(payload.chatId);
    };

    // 4. Chat declined
    const handleChatDecline = () => {
      setOutgoingRequestTarget(null);
      pendingOutgoingRef.current = null;
      setErrorNotice('Commuter declined your chat request.');
      setTimeout(() => setErrorNotice(null), 4000);
    };

    // 5. Incoming message
    const handleChatMessage = (msg: ChatMessagePayload) => {
      const isSelf = msg.senderId === socket.id;

      setConversations((prev) => {
        const conv = prev[msg.chatId];
        const newMsg: ChatMessage = {
          id: msg.messageId,
          senderId: msg.senderId,
          text: msg.text,
          timestamp: msg.timestamp,
          isSelf,
        };

        if (!conv) {
          // If we received a message for a conversation not yet populated, create stub
          return {
            ...prev,
            [msg.chatId]: {
              chatId: msg.chatId,
              partnerId: msg.senderId,
              partnerName: 'Co-Rider',
              messages: [newMsg],
              unreadCount: activeChatIdRef.current === msg.chatId ? 0 : 1,
            },
          };
        }

        const isViewing = activeChatIdRef.current === msg.chatId;
        return {
          ...prev,
          [msg.chatId]: {
            ...conv,
            messages: [...conv.messages, newMsg],
            unreadCount: isViewing || isSelf ? conv.unreadCount : conv.unreadCount + 1,
          },
        };
      });
    };

    // 6. Chat ended
    const handleChatEnd = (payload: ChatEndPayload) => {
      setConversations((prev) => {
        const next = { ...prev };
        delete next[payload.chatId];
        return next;
      });

      if (activeChatIdRef.current === payload.chatId) {
        setActiveChatId(null);
      }
      setErrorNotice(payload.reason || 'Chat ended.');
      setTimeout(() => setErrorNotice(null), 4000);
    };

    // 7. Error handlers & Blocks
    const handleChatError = (err: { error: string }) => {
      setErrorNotice(err.error);
      setTimeout(() => setErrorNotice(null), 4000);
    };

    const handleUserBlocked = ({ targetUserId }: { targetUserId: string }) => {
      setBlockedUserIds((prev) => new Set(prev).add(targetUserId));
    };

    socket.on(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresence);
    socket.on(SOCKET_EVENTS.CHAT_REQUEST, handleChatRequest);
    socket.on(SOCKET_EVENTS.CHAT_ACCEPT, handleChatAccept);
    socket.on(SOCKET_EVENTS.CHAT_DECLINE, handleChatDecline);
    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
    socket.on(SOCKET_EVENTS.CHAT_END, handleChatEnd);
    socket.on('chat:error', handleChatError);
    socket.on('user:blocked', handleUserBlocked);

    return () => {
      socket.off(SOCKET_EVENTS.PRESENCE_UPDATE, handlePresence);
      socket.off(SOCKET_EVENTS.CHAT_REQUEST, handleChatRequest);
      socket.off(SOCKET_EVENTS.CHAT_ACCEPT, handleChatAccept);
      socket.off(SOCKET_EVENTS.CHAT_DECLINE, handleChatDecline);
      socket.off(SOCKET_EVENTS.CHAT_MESSAGE, handleChatMessage);
      socket.off(SOCKET_EVENTS.CHAT_END, handleChatEnd);
      socket.off('chat:error', handleChatError);
      socket.off('user:blocked', handleUserBlocked);
    };
  }, [socket, blockedUserIds]);

  // Actions
  const sendRequest = useCallback(
    (toUserId: string, targetName: string) => {
      if (!socket || !socket.connected) return;
      pendingOutgoingRef.current = { id: toUserId, name: targetName };
      setOutgoingRequestTarget(targetName);
      socket.emit(SOCKET_EVENTS.CHAT_REQUEST, { toUserId });
    },
    [socket]
  );

  const acceptRequest = useCallback(() => {
    if (!socket || !incomingRequest) return;
    pendingOutgoingRef.current = {
      id: incomingRequest.fromUserId,
      name: incomingRequest.fromUserName,
    };
    socket.emit(SOCKET_EVENTS.CHAT_ACCEPT, { requestId: incomingRequest.requestId });
    setIncomingRequest(null);
  }, [socket, incomingRequest]);

  const declineRequest = useCallback(() => {
    if (!socket || !incomingRequest) return;
    socket.emit(SOCKET_EVENTS.CHAT_DECLINE, { requestId: incomingRequest.requestId });
    setIncomingRequest(null);
  }, [socket, incomingRequest]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!socket || !activeChatId || !text.trim()) return;
      socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, {
        chatId: activeChatId,
        text: text.trim().slice(0, 300),
      });
    },
    [socket, activeChatId]
  );

  const endChat = useCallback(
    (chatIdToEnd?: string) => {
      const targetId = chatIdToEnd || activeChatId;
      if (!socket || !targetId) return;

      socket.emit(SOCKET_EVENTS.CHAT_END, { chatId: targetId });
      setConversations((prev) => {
        const next = { ...prev };
        delete next[targetId];
        return next;
      });

      if (activeChatId === targetId) {
        // Switch to another open conversation or null
        const remaining = Object.keys(conversations).filter((id) => id !== targetId);
        setActiveChatId(remaining.length > 0 ? remaining[0] : null);
      }
    },
    [socket, activeChatId, conversations]
  );

  const blockUser = useCallback(
    (targetUserId: string) => {
      if (!socket) return;
      socket.emit(SOCKET_EVENTS.USER_BLOCK, { targetUserId });
      setBlockedUserIds((prev) => new Set(prev).add(targetUserId));

      // Find any chat with this user and end it
      Object.values(conversations).forEach((conv) => {
        if (conv.partnerId === targetUserId) {
          endChat(conv.chatId);
        }
      });
    },
    [socket, conversations, endChat]
  );

  const reportUser = useCallback(
    (targetUserId: string, reason: string) => {
      if (!socket) return;
      socket.emit(SOCKET_EVENTS.USER_REPORT, { targetUserId, reason });
      setErrorNotice('Report submitted to moderation.');
      setTimeout(() => setErrorNotice(null), 3000);
    },
    [socket]
  );

  const selectConversation = useCallback((chatId: string | null) => {
    setActiveChatId(chatId);
    if (chatId) {
      setConversations((prev) => {
        if (!prev[chatId]) return prev;
        return {
          ...prev,
          [chatId]: {
            ...prev[chatId],
            unreadCount: 0,
          },
        };
      });
    }
  }, []);

  const activeConversation = activeChatId ? conversations[activeChatId] : null;

  return {
    roomRiders: roomRiders.filter((r) => !blockedUserIds.has(r.id)),
    conversations: Object.values(conversations),
    activeConversation,
    activeChatId,
    chatPartnerName: activeConversation?.partnerName || 'Co-Rider',
    chatPartnerId: activeConversation?.partnerId || null,
    messages: activeConversation?.messages || [],
    incomingRequest,
    outgoingRequestTarget,
    errorNotice,
    sendRequest,
    acceptRequest,
    declineRequest,
    sendMessage,
    endChat,
    blockUser,
    reportUser,
    selectConversation,
    currentUserId: socket?.id,
  };
}
