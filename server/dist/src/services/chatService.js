"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatService = void 0;
class ChatService {
    // requestId -> { fromUserId, toUserId, fromUserName, createdAt }
    pendingRequests = new Map();
    // chatId -> ChatSession
    activeSessions = new Map();
    // userBlocks: userId -> Set of blockedUserIds (Mutual block enforced)
    userBlocks = new Map();
    // rateLimits: userId -> timestamps array
    messageTimestamps = new Map();
    // reports
    reports = [];
    createRequest(fromUserId, fromUserName, toUserId) {
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
    getRequest(requestId) {
        return this.pendingRequests.get(requestId);
    }
    acceptRequest(requestId, recipientUserId) {
        const req = this.pendingRequests.get(requestId);
        if (!req)
            return { error: 'Request not found or expired.' };
        if (req.toUserId !== recipientUserId)
            return { error: 'Unauthorized request acceptance.' };
        this.pendingRequests.delete(requestId);
        const chatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const session = {
            chatId,
            users: [req.fromUserId, req.toUserId],
            createdAt: Date.now(),
        };
        this.activeSessions.set(chatId, session);
        return { chatId, session };
    }
    declineRequest(requestId, recipientUserId) {
        const req = this.pendingRequests.get(requestId);
        if (!req || req.toUserId !== recipientUserId)
            return false;
        this.pendingRequests.delete(requestId);
        return true;
    }
    endChat(chatId, userId) {
        const session = this.activeSessions.get(chatId);
        if (!session || !session.users.includes(userId))
            return null;
        this.activeSessions.delete(chatId);
        return session;
    }
    isUserInChat(chatId, userId) {
        const session = this.activeSessions.get(chatId);
        return session ? session.users.includes(userId) : false;
    }
    getChatPartner(chatId, userId) {
        const session = this.activeSessions.get(chatId);
        if (!session)
            return null;
        return session.users[0] === userId ? session.users[1] : session.users[0];
    }
    blockUser(userId, targetUserId) {
        // Mutual block
        if (!this.userBlocks.has(userId))
            this.userBlocks.set(userId, new Set());
        if (!this.userBlocks.has(targetUserId))
            this.userBlocks.set(targetUserId, new Set());
        this.userBlocks.get(userId).add(targetUserId);
        this.userBlocks.get(targetUserId).add(userId);
        // End active chat if one exists between them
        for (const [chatId, session] of this.activeSessions.entries()) {
            if (session.users.includes(userId) && session.users.includes(targetUserId)) {
                this.activeSessions.delete(chatId);
            }
        }
    }
    isBlocked(userA, userB) {
        return this.userBlocks.get(userA)?.has(userB) || this.userBlocks.get(userB)?.has(userA) || false;
    }
    checkRateLimit(userId, maxMessages = 5, windowMs = 10000) {
        const now = Date.now();
        const timestamps = (this.messageTimestamps.get(userId) || []).filter(t => now - t < windowMs);
        if (timestamps.length >= maxMessages) {
            return false; // Rate limit exceeded
        }
        timestamps.push(now);
        this.messageTimestamps.set(userId, timestamps);
        return true;
    }
    addReport(reporterId, targetId, reason) {
        const report = {
            reporterId,
            targetId,
            reason: reason.slice(0, 500),
            timestamp: Date.now(),
        };
        this.reports.push(report);
        console.log(`[REPORT] User ${reporterId} reported ${targetId}. Reason: ${reason}`);
    }
    handleDisconnect(userId) {
        const endedChatIds = [];
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
exports.ChatService = ChatService;
