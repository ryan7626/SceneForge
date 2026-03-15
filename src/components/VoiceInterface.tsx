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

/** Inner component that lives inside LiveKitRoom and reads voice state */
function ActiveSession({ onDisconnect }: { onDisconnect: () => void }) {
  const { state } = useVoiceAssistant();
  const disconnectBtn = useDisconnectButton({});
  const [slowConnect, setSlowConnect] = useState(false);
  const slowRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (state === "connecting" || state === "initializing") {
      slowRef.current = setTimeout(() => setSlowConnect(true), 8000);
    } else {
      clearTimeout(slowRef.current);
      setSlowConnect(false);
    }
    return () => clearTimeout(slowRef.current);
  }, [state]);

  const isActive = state === "listening" || state === "speaking";
  const isConnecting = state === "connecting" || state === "initializing";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Large orb */}
      <div className="relative w-48 h-48">
        <VoicePoweredOrb
          enableVoiceControl={isActive}
          hue={25}
          voiceSensitivity={2.0}
          maxRotationSpeed={1.5}
          maxHoverIntensity={0.9}
          className="rounded-full overflow-hidden"
        />
        {isActive && (
          <span className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-ping pointer-events-none" />
        )}
      </div>

      {/* State label */}
      <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: isActive ? "var(--color-primary)" : "var(--color-muted)" }}>
        {state === "speaking" ? "Speaking" : state === "listening" ? "Listening" : state === "thinking" ? "Thinking..." : isConnecting ? (slowConnect ? "Waking agent..." : "Connecting...") : "Ready"}
      </p>

      {/* Stop button */}
      <button
        onClick={() => { disconnectBtn.buttonProps.onClick?.({} as any); onDisconnect(); }}
        className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-all shadow-lg shadow-red-500/30 hover:scale-105"
        title="Stop session"
      >
        <div className="w-4 h-4 rounded-sm bg-white" />
      </button>
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

  const handleError = useCallback((err: Error) => {
    console.error("LiveKit room error:", err);
    setError(err.message || "Connection error");
    setConnectionDetails(null);
  }, []);

  if (connectionDetails) {
    return (
      <LiveKitRoom
        serverUrl={connectionDetails.serverUrl}
        token={connectionDetails.participantToken}
        connect={true}
        audio={true}
        video={false}
        onDisconnected={disconnect}
        onError={handleError}
        className="flex flex-col items-center"
      >
        <ActiveSession onDisconnect={disconnect} />
      </LiveKitRoom>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Large idle orb — click to start */}
      <button
        onClick={connect}
        disabled={isConnecting}
        className={`group relative w-48 h-48 rounded-full overflow-hidden transition-all duration-300 ${
          isConnecting ? "opacity-70 cursor-wait" : "hover:scale-105 cursor-pointer"
        }`}
        title="Start memory assistant"
      >
        <VoicePoweredOrb
          enableVoiceControl={false}
          hue={0}
          className="rounded-full"
        />
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isConnecting ? (
            <div className="w-8 h-8 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <svg
              className="w-10 h-10 text-white/70 group-hover:text-white transition-colors drop-shadow-lg"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          )}
        </div>
      </button>

      {/* Label */}
      <p className="text-[9px] uppercase tracking-[0.2em] text-white/30 font-light">
        {isConnecting ? "Connecting..." : "Tap to start"}
      </p>

      {/* Error */}
      {error && (
        <div className="text-center space-y-2">
          <p className="text-[9px] uppercase tracking-[0.15em] text-red-400/70 font-light">{error}</p>
          <button onClick={() => { setError(null); connect(); }} className="text-[9px] uppercase tracking-[0.15em] text-white/40 font-light hover:text-white/70 underline underline-offset-4">
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
