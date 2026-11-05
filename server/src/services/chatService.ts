import { ReportsStore } from './reportsStore';
import { sanitizeInput } from './moderation';
import { CONFIG } from '../config';

export interface ChatSession {
  chatId: string;
  users: [string, string]; // Public IDs
  socketIds: [string, string];
  createdAt: number;
}

export interface ChatRequest {
  requestId: string;
  fromPublicId: string;
  fromSocketId: string;
  fromUserName: string;
  toPublicId: string;
  toSocketId: string;
  roomId: string;
  createdAt: number;
}

export class ChatService {
  // requestId -> ChatRequest
  private pendingRequests: Map<string, ChatRequest> = new Map();
  // chatId -> ChatSession
  private activeSessions: Map<string, ChatSession> = new Map();
  // userBlocks: publicId -> Set of blocked publicIds (Mutual block)
  private userBlocks: Map<string, Set<string>> = new Map();
  // rate limits: publicId -> timestamps array
  private messageTimestamps: Map<string, number[]> = new Map();
  private requestTimestamps: Map<string, number[]> = new Map();

  private reportsStore: ReportsStore;

  constructor(reportsStore: ReportsStore) {
    this.reportsStore = reportsStore;

    // Routine TTL cleanup every 15s to expire requests older than 60s
    setInterval(() => {
      this.cleanupExpiredRequests();
    }, 15000);
  }

  private cleanupExpiredRequests() {
    const now = Date.now();
    for (const [id, req] of this.pendingRequests.entries()) {
      if (now - req.createdAt > 60000) {
        this.pendingRequests.delete(id);
      }
    }
  }

  public getPendingRequestsCountForUser(fromPublicId: string): number {
    let count = 0;
    const now = Date.now();
    for (const req of this.pendingRequests.values()) {
      if (req.fromPublicId === fromPublicId && now - req.createdAt <= 60000) {
        count++;
      }
    }
    return count;
  }

  public createRequest(params: {
    fromPublicId: string;
    fromSocketId: string;
    fromUserName: string;
    toPublicId: string;
    toSocketId: string;
    fromRoomId: string;
    toRoomId?: string;
  }): { requestId: string } | { error: string } {
    const { fromPublicId, fromSocketId, fromUserName, toPublicId, toSocketId, fromRoomId, toRoomId } = params;

    // Check if muted
    if (this.reportsStore.isMuted(fromPublicId)) {
      return { error: 'Your account has been temporarily restricted from sending chat requests.' };
    }

    // Mutual block check
    if (this.isBlocked(fromPublicId, toPublicId)) {
      return { error: 'Unable to send request to this rider.' };
    }

    // Same room requirement
    if (!fromRoomId || fromRoomId !== toRoomId) {
      return { error: 'Chat requests can only be sent to co-riders on the same train line.' };
    }

    // Prevent duplicate active request to the same target
    const now = Date.now();
    for (const req of this.pendingRequests.values()) {
      if (req.fromPublicId === fromPublicId && req.toPublicId === toPublicId && now - req.createdAt < 60000) {
        return { error: 'A pending request has already been sent to this rider.' };
      }
    }

    // Max 3 pending requests per user
    if (this.getPendingRequestsCountForUser(fromPublicId) >= 3) {
      return { error: 'You have reached the maximum of 3 pending requests. Please wait for responses or timeout.' };
    }

    // Rate limit requests (e.g. max 3 requests per 60s)
    if (!this.checkRateLimit(fromPublicId, this.requestTimestamps, CONFIG.RATE_LIMIT_REQUESTS_MAX, CONFIG.RATE_LIMIT_REQUESTS_WINDOW_MS)) {
      return { error: 'You are sending chat requests too quickly. Please slow down.' };
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.pendingRequests.set(requestId, {
      requestId,
      fromPublicId,
      fromSocketId,
      fromUserName,
      toPublicId,
      toSocketId,
      roomId: fromRoomId,
      createdAt: now,
    });

    return { requestId };
  }

  public getRequest(requestId: string): ChatRequest | undefined {
    const req = this.pendingRequests.get(requestId);
    if (!req) return undefined;
    if (Date.now() - req.createdAt > 60000) {
      this.pendingRequests.delete(requestId);
      return undefined;
    }
    return req;
  }

  public acceptRequest(requestId: string, recipientSocketId: string): { chatId: string; session: ChatSession } | { error: string } {
    const req = this.getRequest(requestId);
    if (!req) return { error: 'Request not found or expired.' };
    if (req.toSocketId !== recipientSocketId) return { error: 'Unauthorized request acceptance.' };

    this.pendingRequests.delete(requestId);
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const session: ChatSession = {
      chatId,
      users: [req.fromPublicId, req.toPublicId],
      socketIds: [req.fromSocketId, req.toSocketId],
      createdAt: Date.now(),
    };
    this.activeSessions.set(chatId, session);
    return { chatId, session };
  }

  public declineRequest(requestId: string, recipientSocketId: string): boolean {
    const req = this.getRequest(requestId);
    if (!req || req.toSocketId !== recipientSocketId) return false;
    this.pendingRequests.delete(requestId);
    return true;
  }

  public endChat(chatId: string, userSocketId: string): ChatSession | null {
    const session = this.activeSessions.get(chatId);
    if (!session || !session.socketIds.includes(userSocketId)) return null;
    this.activeSessions.delete(chatId);
    return session;
  }

  public isSocketInChat(chatId: string, socketId: string): boolean {
    const session = this.activeSessions.get(chatId);
    return session ? session.socketIds.includes(socketId) : false;
  }

  public getChatPartnerSocketId(chatId: string, socketId: string): string | null {
    const session = this.activeSessions.get(chatId);
    if (!session) return null;
    return session.socketIds[0] === socketId ? session.socketIds[1] : session.socketIds[0];
  }

  public blockUser(userPublicId: string, targetPublicId: string) {
    if (!this.userBlocks.has(userPublicId)) this.userBlocks.set(userPublicId, new Set());
    if (!this.userBlocks.has(targetPublicId)) this.userBlocks.set(targetPublicId, new Set());

    this.userBlocks.get(userPublicId)!.add(targetPublicId);
    this.userBlocks.get(targetPublicId)!.add(userPublicId);

    // End active chat if one exists between them
    for (const [chatId, session] of this.activeSessions.entries()) {
      if (session.users.includes(userPublicId) && session.users.includes(targetPublicId)) {
        this.activeSessions.delete(chatId);
      }
    }
  }

  public isBlocked(userA: string, userB: string): boolean {
    return this.userBlocks.get(userA)?.has(userB) || this.userBlocks.get(userB)?.has(userA) || false;
  }

  public checkMessageRateLimit(publicId: string): boolean {
    return this.checkRateLimit(publicId, this.messageTimestamps, CONFIG.RATE_LIMIT_MAX_MESSAGES, CONFIG.RATE_LIMIT_WINDOW_MS);
  }

  private checkRateLimit(key: string, map: Map<string, number[]>, maxCount: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = (map.get(key) || []).filter((t) => now - t < windowMs);
    if (timestamps.length >= maxCount) {
      return false;
    }
    timestamps.push(now);
    map.set(key, timestamps);
    return true;
  }

  public addReport(reporterPublicId: string, targetPublicId: string, reason: string): { isMuted: boolean } {
    return this.reportsStore.addReport(reporterPublicId, targetPublicId, reason);
  }

  public sanitizeMessage(text: string): { cleanText: string; isFlagged: boolean } {
    return sanitizeInput(text, CONFIG.MAX_MESSAGE_LENGTH);
  }

  /**
   * Cleans up on user disconnect.
   * Returns list of ended sessions with partner socket IDs to notify ONLY the specific partner.
   */
  public handleDisconnect(socketId: string): { chatId: string; partnerSocketId: string }[] {
    const notifications: { chatId: string; partnerSocketId: string }[] = [];

    for (const [chatId, session] of this.activeSessions.entries()) {
      if (session.socketIds.includes(socketId)) {
        const partnerSocketId = session.socketIds[0] === socketId ? session.socketIds[1] : session.socketIds[0];
        notifications.push({ chatId, partnerSocketId });
        this.activeSessions.delete(chatId);
      }
    }

    // Clean up pending requests
    for (const [reqId, req] of this.pendingRequests.entries()) {
      if (req.fromSocketId === socketId || req.toSocketId === socketId) {
        this.pendingRequests.delete(reqId);
      }
    }

    return notifications;
  }
}
