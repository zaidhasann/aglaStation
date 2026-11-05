'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, ShieldAlert, Ban, UserPlus, PhoneOff, Users, ArrowLeft } from 'lucide-react';
import { ChatMessage, ActiveConversation } from '@/hooks/useChat';
import { PresenceRider } from 'agla-station-shared';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ActiveConversation[];
  activeChatId: string | null;
  chatPartnerName: string;
  chatPartnerId: string | null;
  messages: ChatMessage[];
  roomRiders: PresenceRider[];
  outgoingRequestTarget: string | null;
  onSendRequest: (toUserId: string, targetName: string) => void;
  onSendMessage: (text: string) => void;
  onEndChat: (chatId?: string) => void;
  onBlockUser: (targetUserId: string) => void;
  onReportUser: (targetUserId: string, reason: string) => void;
  onSelectConversation: (chatId: string | null) => void;
  accentColor?: string;
  onLineColor?: string;
}

export function ChatDrawer({
  isOpen,
  onClose,
  conversations,
  activeChatId,
  chatPartnerName,
  chatPartnerId,
  messages,
  roomRiders,
  outgoingRequestTarget,
  onSendRequest,
  onSendMessage,
  onEndChat,
  onBlockUser,
  onReportUser,
  onSelectConversation,
  accentColor = '#F5C518',
  onLineColor = '#0A0A0A',
}: ChatDrawerProps) {
  const [inputText, setInputText] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
    setInputText('');
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    onReportUser(chatPartnerId ?? '', reportReason);
    setReportReason('');
    setShowReportModal(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 z-50"
          />

          {/* Drawer Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#111111] border-t border-[#2A2A2A] z-50 h-[82vh] flex flex-col overflow-hidden"
            style={{ borderTopLeftRadius: 6, borderTopRightRadius: 6 }}
          >
            {/* Header */}
            <div className="p-3 bg-[#111111] border-b border-[#2A2A2A] flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                {activeChatId ? (
                  <button
                    onClick={() => onSelectConversation(null)}
                    className="tap-target px-2 py-1 text-[#888888] hover:text-[#E8E8E8] text-xs flex items-center gap-1 border border-[#2A2A2A] bg-[#161616]"
                    style={{ borderRadius: 4 }}
                    title="Back to all conversations"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Chats</span>
                  </button>
                ) : (
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: accentColor }}
                    aria-hidden="true"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#E8E8E8] truncate">
                    {activeChatId ? chatPartnerName : 'Metro Compartment Chats'}
                  </h3>
                  <p className="text-[11px] text-[#666666] truncate">
                    {activeChatId
                      ? 'Private 1-on-1 session'
                      : `${conversations.length} active chat${conversations.length === 1 ? '' : 's'} · ${roomRiders.length} aboard`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {activeChatId && (
                  <>
                    <button
                      onClick={() => setShowReportModal(true)}
                      className="tap-target px-2 text-[#888888] hover:text-[#E8E8E8] text-xs flex items-center gap-1"
                      title="Report"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onBlockUser(chatPartnerId ?? '')}
                      className="tap-target px-2 text-[#888888] hover:text-[#D0021B] text-xs flex items-center gap-1"
                      title="Block"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEndChat(activeChatId)}
                      className="tap-target px-2 text-[#D0021B] hover:opacity-80 text-xs flex items-center gap-1 font-semibold"
                      title="Leave conversation"
                    >
                      <PhoneOff className="w-4 h-4" />
                      <span>Leave</span>
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="tap-target p-2 text-[#888888] hover:text-white ml-1"
                  aria-label="Close drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Conversation Tabs (When Multiple Chats Active) */}
            {conversations.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0c0c0c] border-b border-[#222222] overflow-x-auto scrollbar-none">
                <button
                  onClick={() => onSelectConversation(null)}
                  className={`tap-target px-2.5 py-1 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 border transition-colors ${
                    activeChatId === null
                      ? 'bg-[#1e1e1e] text-white border-current'
                      : 'bg-[#121212] border-[#222222] text-[#888888] hover:text-[#cccccc]'
                  }`}
                  style={{
                    borderRadius: 4,
                    borderColor: activeChatId === null ? accentColor : undefined,
                  }}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Riders ({roomRiders.length})</span>
                </button>

                {conversations.map((conv) => {
                  const isActiveTab = activeChatId === conv.chatId;
                  return (
                    <button
                      key={conv.chatId}
                      onClick={() => onSelectConversation(conv.chatId)}
                      className={`tap-target px-3 py-1 text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 border transition-colors relative ${
                        isActiveTab
                          ? 'bg-[#1e1e1e] text-white'
                          : 'bg-[#121212] border-[#222222] text-[#888888] hover:text-[#cccccc]'
                      }`}
                      style={{
                        borderRadius: 4,
                        borderColor: isActiveTab ? accentColor : undefined,
                      }}
                    >
                      <span className="truncate max-w-[100px]">{conv.partnerName}</span>
                      {conv.unreadCount > 0 && (
                        <span
                          className="w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: accentColor, color: onLineColor }}
                        >
                          {conv.unreadCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {activeChatId ? (
                /* Specific Active Conversation */
                messages.length === 0 ? (
                  <div className="my-auto text-center text-[#666666] text-xs flex flex-col items-center gap-1">
                    <p className="text-[#E8E8E8] font-semibold">Connected to {chatPartnerName}</p>
                    <p>Both of you hear the same music at the same time.</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col max-w-[85%] ${m.isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                    >
                      <div
                        className="px-3.5 py-2 text-xs leading-relaxed"
                        style={{
                          borderRadius: 4,
                          backgroundColor: m.isSelf ? accentColor : '#1a1a1a',
                          color: m.isSelf ? onLineColor : '#E8E8E8',
                          border: m.isSelf ? 'none' : '1px solid #2A2A2A',
                        }}
                      >
                        {m.text}
                      </div>
                      <span className="text-[10px] text-[#555555] mt-1 px-0.5">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )
              ) : (
                /* Overview: Active Chats + Available Riders */
                <div className="flex flex-col gap-4">
                  {/* Active Ongoing Chats List */}
                  {conversations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-2">
                        Active Private Chats ({conversations.length})
                      </h4>
                      <div className="flex flex-col gap-1.5">
                        {conversations.map((conv) => {
                          const lastMsg = conv.messages[conv.messages.length - 1];
                          return (
                            <div
                              key={conv.chatId}
                              onClick={() => onSelectConversation(conv.chatId)}
                              className="bg-[#141414] hover:bg-[#1c1c1c] border border-[#222222] p-3 flex items-center justify-between cursor-pointer transition-colors"
                              style={{ borderRadius: 4 }}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-[#E8E8E8]">{conv.partnerName}</span>
                                  {conv.unreadCount > 0 && (
                                    <span
                                      className="px-1.5 py-0.2 text-[9px] font-bold rounded-full"
                                      style={{ backgroundColor: accentColor, color: onLineColor }}
                                    >
                                      {conv.unreadCount} new
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#666666] truncate mt-0.5">
                                  {lastMsg ? `${lastMsg.isSelf ? 'You: ' : ''}${lastMsg.text}` : 'Conversation open'}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectConversation(conv.chatId);
                                }}
                                className="tap-target px-3 py-1 text-xs font-semibold border border-[#333] text-[#E8E8E8] bg-[#1e1e1e]"
                                style={{ borderRadius: 4 }}
                              >
                                Open
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {outgoingRequestTarget && (
                    <div
                      className="border p-3 text-xs flex items-center justify-between"
                      style={{
                        backgroundColor: '#1a1a1a',
                        borderColor: accentColor,
                        borderRadius: 4,
                      }}
                    >
                      <span className="text-[#E8E8E8]">
                        Request sent to <strong>{outgoingRequestTarget}</strong>. Waiting for acceptance…
                      </span>
                    </div>
                  )}

                  {/* Available Co-Riders */}
                  <div>
                    <h4 className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-2">
                      Available Riders in Coach
                    </h4>

                    {roomRiders.length === 0 ? (
                      <div className="text-center py-8 text-[#555555] text-xs flex flex-col gap-1">
                        <p className="text-[#888888] font-semibold">Only you on this train</p>
                        <p>Music continues playing in sync with the line.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {roomRiders.map((rider) => {
                          const existingConv = conversations.find((c) => c.partnerId === rider.id);
                          return (
                            <div
                              key={rider.id}
                              className="bg-[#141414] border border-[#222222] p-3 flex items-center justify-between"
                              style={{ borderRadius: 4 }}
                            >
                              <div>
                                <div className="text-xs font-semibold text-[#E8E8E8]">{rider.name}</div>
                                <div className="text-[10px] text-[#666666]">Connected commuter</div>
                              </div>

                              {existingConv ? (
                                <button
                                  onClick={() => onSelectConversation(existingConv.chatId)}
                                  className="tap-target flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#333] hover:border-[#555] text-[#E8E8E8] bg-[#1a1a1a]"
                                  style={{ borderRadius: 4 }}
                                >
                                  <span>Chatting</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => onSendRequest(rider.id, rider.name)}
                                  className="tap-target flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-[#333] hover:border-[#555] text-[#E8E8E8] bg-[#1a1a1a]"
                                  style={{ borderRadius: 4 }}
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Request chat</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar (When In Active Chat) */}
            {activeChatId && (
              <form onSubmit={handleSend} className="p-3 bg-[#111111] border-t border-[#2A2A2A] flex items-center gap-2">
                <input
                  type="text"
                  maxLength={300}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a message…"
                  className="tap-target flex-1 bg-[#0A0A0A] border border-[#2A2A2A] px-3.5 py-2 text-xs text-[#E8E8E8] placeholder-[#555555] focus:outline-none"
                  style={{ borderRadius: 4 }}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="tap-target min-w-[44px] flex items-center justify-center font-bold text-xs transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: accentColor,
                    color: onLineColor,
                    borderRadius: 4,
                  }}
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4 fill-current" />
                </button>
              </form>
            )}
          </motion.div>

          {/* Abuse Report Modal */}
          {showReportModal && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div
                className="bg-[#111111] border border-[#2A2A2A] p-5 max-w-sm w-full flex flex-col gap-4"
                style={{ borderRadius: 4 }}
              >
                <div className="flex items-center gap-2 text-[#D0021B]">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="text-sm font-bold text-[#E8E8E8]">Report Commuter</h3>
                </div>
                <p className="text-xs text-[#888888] leading-relaxed">
                  Reports are logged for train moderation for harassment, spam, or abuse.
                </p>
                <form onSubmit={handleReportSubmit} className="flex flex-col gap-3">
                  <textarea
                    required
                    maxLength={300}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Describe what occurred…"
                    className="w-full min-h-[80px] bg-[#0A0A0A] border border-[#2A2A2A] p-3 text-xs text-[#E8E8E8] placeholder-[#555555] focus:outline-none"
                    style={{ borderRadius: 4 }}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(false)}
                      className="tap-target px-3 py-1.5 text-xs text-[#888888] hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="tap-target bg-[#D0021B] hover:opacity-90 text-white font-bold px-4 py-2 text-xs transition-opacity"
                      style={{ borderRadius: 4 }}
                    >
                      Submit Report
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
