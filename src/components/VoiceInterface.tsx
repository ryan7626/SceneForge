"use client";

import {
  LiveKitRoom,
  useVoiceAssistant,
  useDisconnectButton,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useCallback, useEffect, useState, useRef } from "react";
import { VoicePoweredOrb } from "@/components/ui/voice-powered-orb";
import type { ConnectionDetails } from "@/lib/types";

const SUGGESTIONS = [
  "What was I doing on December 1st, 2009?",
  "Show me my summer vacation photos",
  "Take me back to my birthday party",
  "Find photos from 2015",
];

/** Inner component that lives inside LiveKitRoom and reads voice state */
function ActiveSession({ onTimeout, onDisconnect }: { onTimeout: () => void; onDisconnect: () => void }) {
  const { state } = useVoiceAssistant();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const disconnectBtn = useDisconnectButton({});

  useEffect(() => {
    if (state === "connecting" || state === "initializing") {
      timeoutRef.current = setTimeout(onTimeout, 15000);
    } else {
      clearTimeout(timeoutRef.current);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [state, onTimeout]);

  const isActive = state === "listening" || state === "speaking";
  const isConnecting = state === "connecting" || state === "initializing";

  return (
    <div className="flex items-center gap-3">
      {/* Animated orb — larger when active */}
      <div className={`relative transition-all duration-500 ease-out ${isActive ? "w-20 h-20" : "w-16 h-16"}`}>
        <VoicePoweredOrb
          enableVoiceControl={isActive}
          hue={25}
          voiceSensitivity={2.0}
          maxRotationSpeed={1.5}
          maxHoverIntensity={0.9}
          className="rounded-full overflow-hidden"
        />
        {/* Pulse ring */}
        {isActive && (
          <span className="absolute -inset-1 rounded-full border-2 border-primary/30 animate-ping pointer-events-none" />
        )}
      </div>

      {/* Stop button — red circle with square inside */}
      <button
        onClick={() => { disconnectBtn.buttonProps.onClick?.({} as any); onDisconnect(); }}
        className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg shadow-red-500/30 hover:scale-105"
        title="Stop session"
      >
        {/* Square stop icon */}
        <div className="w-3.5 h-3.5 rounded-sm bg-white" />
      </button>

      {/* Tiny state label */}
      {isConnecting && (
        <span className="text-[9px] uppercase tracking-widest text-muted font-bold animate-pulse">
          Connecting...
        </span>
      )}
    </div>
  );
}

interface VoiceInterfaceProps {
  onWorldGenerated?: (worldUrl: string, splatUrl?: string) => void;
}

export function VoiceInterface({ onWorldGenerated: _onWorldGenerated }: VoiceInterfaceProps) {
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/connection-details");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect");
      setConnectionDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnectionDetails(null);
    setError(null);
  }, []);

  const handleTimeout = useCallback(() => {
    setError("Agent not responding");
    setConnectionDetails(null);
  }, []);

  useEffect(() => {
    // Data channel listener for world generation events
  }, [_onWorldGenerated]);

  const isSessionActive = !!connectionDetails;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
      {/* Floating suggestions — show on hover or when session active */}
      <div
        className="relative"
        onMouseEnter={() => setShowSuggestions(true)}
        onMouseLeave={() => setShowSuggestions(false)}
      >
        {(showSuggestions || isSessionActive) && (
          <div className="flex items-center gap-2 mb-1 animate-in fade-in slide-in-from-right-4 duration-300">
            {SUGGESTIONS.map((s, i) => (
              <div
                key={i}
                className="px-3 py-1.5 bg-white/90 backdrop-blur-md border border-slate-200 text-[10px] text-main tracking-wide whitespace-nowrap shadow-sm hover:border-primary/40 hover:text-primary transition-colors cursor-default max-w-48 truncate"
              >
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error tooltip */}
      {error && (
        <div className="absolute bottom-20 right-0 bg-red-50 border border-red-200 text-red-600 text-[10px] uppercase tracking-widest font-bold px-4 py-2 whitespace-nowrap shadow-lg">
          {error}
          <button onClick={() => { setError(null); connect(); }} className="ml-3 underline underline-offset-2">
            Retry
          </button>
        </div>
      )}

      {/* Main orb area */}
      {isSessionActive ? (
        <LiveKitRoom
          serverUrl={connectionDetails.serverUrl}
          token={connectionDetails.participantToken}
          connect={true}
          audio={true}
          video={false}
          onDisconnected={disconnect}
          style={{ display: "flex", alignItems: "center" }}
        >
          <ActiveSession onTimeout={handleTimeout} onDisconnect={disconnect} />
        </LiveKitRoom>
      ) : (
        /* Idle orb — click to start */
        <button
          onClick={connect}
          disabled={isConnecting}
          className={`group relative rounded-full overflow-hidden shadow-lg transition-all duration-300 ${
            isConnecting
              ? "w-16 h-16 opacity-70 cursor-wait"
              : "w-16 h-16 hover:shadow-xl hover:scale-110 cursor-pointer"
          }`}
          title="Start memory assistant"
        >
          <div className="absolute inset-0">
            <VoicePoweredOrb
              enableVoiceControl={false}
              hue={0}
              className="rounded-full"
            />
          </div>

          {/* Mic icon */}
          {isConnecting ? (
            <div className="relative z-10 w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin mx-auto" />
          ) : (
            <svg
              className="w-5 h-5 relative z-10 mx-auto text-white/80 group-hover:text-white transition-colors drop-shadow-md"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
