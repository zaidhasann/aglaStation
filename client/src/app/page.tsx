'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useSync } from '@/hooks/useSync';
import { Station, Direction, MetroLine } from 'agla-station-shared';
import { SelectionFlow } from '@/components/metro/SelectionFlow';
import { NowPlayingCard } from '@/components/metro/NowPlayingCard';
import { VisualMetroMap } from '@/components/metro/VisualMetroMap';
import { AudioGateModal } from '@/components/audio/AudioGateModal';
import { StationAdvanceToast } from '@/components/metro/StationAdvanceToast';
import { ReconnectingBanner } from '@/components/ui/ReconnectingBanner';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { ChatDrawer } from '@/components/chat/ChatDrawer';
import { ChatRequestModal } from '@/components/chat/ChatRequestModal';
import { useChat } from '@/hooks/useChat';
import { ArrowLeft, Train, MapPin } from 'lucide-react';
import { getLineTheme } from '@/lib/metroThemes';
import allLinesData from '@/data/lines.json';

const ALL_LINES = allLinesData as Record<string, MetroLine>;

export default function Home() {
  const [rideConfig, setRideConfig] = useState<{
    lineId: string;
    direction: Direction;
    startStationId: string;
    destStationId: string;
    userName?: string;
  } | null>(null);

  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'strip' | 'route'>('strip');
  const [toastStation, setToastStation] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const {
    roomRiders,
    conversations,
    activeChatId,
    chatPartnerId,
    chatPartnerName,
    messages,
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
  } = useChat();

  const activeLine = rideConfig ? ALL_LINES[rideConfig.lineId] || ALL_LINES['yellow'] : ALL_LINES['yellow'];
  const theme = getLineTheme(rideConfig?.lineId || 'yellow');

  // Station arrival toast trigger
  const handleStationAdvance = useCallback((current: Station) => {
    setToastStation(current.name);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  }, []);

  const {
    currentStation,
    nextStation,
    track,
    stationIndex,
    listenersCount,
    stationCounts,
    computeTargetSeek,
    advanceStation,
    isConnected,
  } = useSync({
    lineId: rideConfig?.lineId || 'yellow',
    direction: rideConfig?.direction || 'up',
    startStationId: rideConfig?.startStationId || activeLine.stations[0].id,
    destStationId: rideConfig?.destStationId || activeLine.stations[activeLine.stations.length - 1].id,
    userName: rideConfig?.userName,
    onStationAdvance: handleStationAdvance,
  });

  const orderedStations = useMemo(() => {
    const list = [...activeLine.stations];
    if (rideConfig?.direction === 'down') {
      return list.reverse();
    }
    return list;
  }, [activeLine, rideConfig?.direction]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E8E8E8] flex flex-col font-sans">
      <ReconnectingBanner isConnected={isConnected} />

      <StationAdvanceToast
        stationName={toastStation}
        isVisible={showToast}
        onDismiss={() => setShowToast(false)}
      />

      <AudioGateModal
        isOpen={rideConfig !== null && !isAudioUnlocked}
        onJoinRide={() => setIsAudioUnlocked(true)}
        lineHex={theme.hex}
        onLineHex={theme.onLine}
      />

      <ChatRequestModal
        request={incomingRequest}
        onAccept={acceptRequest}
        onDecline={declineRequest}
        accentColor={theme.hex}
        onLineColor={theme.onLine}
      />

      <ChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        conversations={conversations}
        activeChatId={activeChatId}
        chatPartnerId={chatPartnerId}
        chatPartnerName={chatPartnerName}
        messages={messages}
        roomRiders={roomRiders}
        outgoingRequestTarget={outgoingRequestTarget}
        onSendRequest={sendRequest}
        onSendMessage={sendMessage}
        onEndChat={endChat}
        onBlockUser={() => blockUser(chatPartnerId ?? '')}
        onReportUser={(reason) => reportUser(chatPartnerId ?? '', reason)}
        onSelectConversation={selectConversation}
        accentColor={theme.hex}
        onLineColor={theme.onLine}
      />

      {errorNotice && (
        <div
          role="alert"
          className="fixed top-12 left-4 right-4 max-w-sm mx-auto z-50 bg-[#D0021B] text-white p-3 text-xs font-semibold shadow-xl text-center"
          style={{ borderRadius: 4 }}
        >
          {errorNotice}
        </div>
      )}

      <InstallPrompt />

      <main className="flex-1 max-w-lg w-full mx-auto p-3 sm:p-4 flex flex-col gap-3">
        {/* Top Navbar */}
        <header className="flex items-center justify-between pb-3 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2">
            <span
              className="w-7 h-7 flex items-center justify-center font-bold text-xs bg-gradient-to-br from-zinc-800 to-zinc-950 border border-zinc-700/60 shadow-inner"
              style={{ borderRadius: 7 }}
              aria-hidden="true"
            >
              <Train className="w-4 h-4 text-white fill-current drop-shadow-sm" />
            </span>
            <div>
              <h1 className="text-base font-extrabold text-[#E8E8E8] tracking-tight font-brand leading-none">aglaStation</h1>
              <p className="text-[10px] text-[#666666] font-medium mt-0.5">Delhi Metro Shared Listening</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {rideConfig && (
              <button
                onClick={() => setRideConfig(null)}
                className="tap-target text-xs bg-[#141414] hover:bg-[#1f1f1f] text-[#888888] px-2.5 py-1 border border-[#2A2A2A] flex items-center gap-1.5 transition-colors"
                style={{ borderRadius: 4 }}
                title="Switch route"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Change Line</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 bg-[#141414] border border-[#2A2A2A] px-2.5 py-1" style={{ borderRadius: 4 }}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#00A650]' : 'bg-[#D0021B]'}`} />
              <span className="text-[11px] text-[#888888] font-medium">{isConnected ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </header>

        {/* View Switcher: Boarding vs Active Ride */}
        {!rideConfig ? (
          <SelectionFlow
            onComplete={(config) => {
              setRideConfig(config);
            }}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {/* View Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#141414] border border-[#2A2A2A] text-xs font-semibold" style={{ borderRadius: 4 }}>
              <button
                onClick={() => setActiveTab('strip')}
                className="tap-target py-1.5 transition-colors"
                style={{
                  borderRadius: 4,
                  backgroundColor: activeTab === 'strip' ? theme.hex : 'transparent',
                  color: activeTab === 'strip' ? theme.onLine : '#888888',
                  fontWeight: activeTab === 'strip' ? 700 : 500,
                }}
              >
                In-Coach Strip Map
              </button>
              <button
                onClick={() => setActiveTab('route')}
                className="tap-target py-1.5 flex items-center justify-center gap-1.5 transition-colors"
                style={{
                  borderRadius: 4,
                  backgroundColor: activeTab === 'route' ? theme.hex : 'transparent',
                  color: activeTab === 'route' ? theme.onLine : '#888888',
                  fontWeight: activeTab === 'route' ? 700 : 500,
                }}
              >
                <MapPin className="w-3.5 h-3.5" /> Live Track
              </button>
            </div>

            {/* Active View */}
            {activeTab === 'strip' ? (
              <NowPlayingCard
                lineId={rideConfig.lineId}
                stations={orderedStations}
                currentStation={currentStation}
                nextStation={nextStation}
                stationIndex={stationIndex}
                stationCounts={stationCounts}
                track={track}
                listenersCount={listenersCount}
                isPlaying={isPlaying}
                isUnlocked={isAudioUnlocked}
                computeTargetSeek={computeTargetSeek}
                onAdvanceStation={advanceStation}
                onPlayStateChange={setIsPlaying}
                onOpenChat={() => setIsChatOpen(true)}
                chatBadge={roomRiders.length}
              />
            ) : (
              <VisualMetroMap
                lineId={rideConfig.lineId}
                stations={orderedStations}
                currentIndex={stationIndex}
                direction={rideConfig.direction}
                stationCounts={stationCounts}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
