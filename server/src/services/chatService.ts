export interface ChatSession {
  chatId: string;
  users: [string, string];
  createdAt: number;
}

export interface ChatReport {
  reporterId: string;
  targetId: string;
  reason: string;
  timestamp: number;
}

export class ChatService {
  // requestId -> { fromUserId, toUserId, fromUserName, createdAt }
  private pendingRequests: Map<string, { fromUserId: string; toUserId: string; fromUserName: string; createdAt: number }> = new Map();
  // chatId -> ChatSession
  private activeSessions: Map<string, ChatSession> = new Map();
  // userBlocks: userId -> Set of blockedUserIds (Mutual block enforced)
  private userBlocks: Map<string, Set<string>> = new Map();
  // rateLimits: userId -> timestamps array
  private messageTimestamps: Map<string, number[]> = new Map();
  // reports
  private reports: ChatReport[] = [];

  public createRequest(fromUserId: string, fromUserName: string, toUserId: string): { requestId: string } | { error: string } {
    if (this.isBlocked(fromUserId, toUserId)) {
      return { error: 'Unable to send request to this user.' };
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.pendingRequests.set(requestId, {
      fromUserId,
      fromUserName,
      toUserId,
      createdAt: Date.now(),
    });
    return { requestId };
  }

  public getRequest(requestId: string) {
    return this.pendingRequests.get(requestId);
  }

  public acceptRequest(requestId: string, recipientUserId: string): { chatId: string; session: ChatSession } | { error: string } {
    const req = this.pendingRequests.get(requestId);
    if (!req) return { error: 'Request not found or expired.' };
    if (req.toUserId !== recipientUserId) return { error: 'Unauthorized request acceptance.' };

    this.pendingRequests.delete(requestId);
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const session: ChatSession = {
      chatId,
      users: [req.fromUserId, req.toUserId],
      createdAt: Date.now(),
    };
    this.activeSessions.set(chatId, session);
    return { chatId, session };
  }

  public declineRequest(requestId: string, recipientUserId: string): boolean {
    const req = this.pendingRequests.get(requestId);
    if (!req || req.toUserId !== recipientUserId) return false;
    this.pendingRequests.delete(requestId);
    return true;
  }

  public endChat(chatId: string, userId: string): ChatSession | null {
    const session = this.activeSessions.get(chatId);
    if (!session || !session.users.includes(userId)) return null;
    this.activeSessions.delete(chatId);
    return session;
  }

  public isUserInChat(chatId: string, userId: string): boolean {
    const session = this.activeSessions.get(chatId);
    return session ? session.users.includes(userId) : false;
  }

  public getChatPartner(chatId: string, userId: string): string | null {
    const session = this.activeSessions.get(chatId);
    if (!session) return null;
    return session.users[0] === userId ? session.users[1] : session.users[0];
  }

  public blockUser(userId: string, targetUserId: string) {
    // Mutual block
    if (!this.userBlocks.has(userId)) this.userBlocks.set(userId, new Set());
    if (!this.userBlocks.has(targetUserId)) this.userBlocks.set(targetUserId, new Set());

    this.userBlocks.get(userId)!.add(targetUserId);
    this.userBlocks.get(targetUserId)!.add(userId);

    // End active chat if one exists between them
    for (const [chatId, session] of this.activeSessions.entries()) {
      if (session.users.includes(userId) && session.users.includes(targetUserId)) {
        this.activeSessions.delete(chatId);
      }
    }
  }

  public isBlocked(userA: string, userB: string): boolean {
    return this.userBlocks.get(userA)?.has(userB) || this.userBlocks.get(userB)?.has(userA) || false;
  }

  public checkRateLimit(userId: string, maxMessages = 5, windowMs = 10000): boolean {
    const now = Date.now();
    const timestamps = (this.messageTimestamps.get(userId) || []).filter(t => now - t < windowMs);
    if (timestamps.length >= maxMessages) {
      return false; // Rate limit exceeded
    }
    timestamps.push(now);
    this.messageTimestamps.set(userId, timestamps);
    return true;
  }

  public addReport(reporterId: string, targetId: string, reason: string) {
    const report: ChatReport = {
      reporterId,
      targetId,
      reason: reason.slice(0, 500),
      timestamp: Date.now(),
    };
    this.reports.push(report);
    console.log(`[REPORT] User ${reporterId} reported ${targetId}. Reason: ${reason}`);
  }

  public handleDisconnect(userId: string): string[] {
    const endedChatIds: string[] = [];
    for (const [chatId, session] of this.activeSessions.entries()) {
      if (session.users.includes(userId)) {
        endedChatIds.push(chatId);
        this.activeSessions.delete(chatId);
      }
    }
    // Clean up pending requests
    for (const [reqId, req] of this.pendingRequests.entries()) {
      if (req.fromUserId === userId || req.toUserId === userId) {
        this.pendingRequests.delete(reqId);
      }
    }
    return endedChatIds;
  }
}
