"use client";

import {
  LiveKitRoom,
  useVoiceAssistant,
  DisconnectButton,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useCallback, useEffect, useState } from "react";
import type { ConnectionDetails } from "@/lib/types";

function VoiceAgent() {
  const { state } = useVoiceAssistant();

  const stateLabels: Record<string, string> = {
    disconnected: "Ready",
    connecting: "Connecting",
    initializing: "Initializing",
    listening: "Listening",
    thinking: "Thinking",
    speaking: "Speaking",
  };

  return (
    <div className="flex flex-col items-center gap-12 py-12">
      <div className="relative w-32 h-32 flex items-center justify-center">
        {/* Breathing amber light when active */}
        <div
          className={`absolute inset-0 border rounded-full transition-all duration-700 ${
            state === "speaking" || state === "listening"
              ? "border-primary/40 animate-pulse-glow"
              : "border-slate-100"
          }`}
        />

        {/* Central "Alive" light dot */}
        <div
          className={`relative z-10 w-3 h-3 rounded-full transition-all duration-500 shadow-lg ${
            state === "listening" || state === "speaking"
              ? "bg-primary scale-[2.5] shadow-primary/50"
              : "bg-slate-300"
          }`}
        />
      </div>

      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-widest text-primary font-bold">
          System Alive
        </p>
        <p className="text-sm text-muted uppercase tracking-widest font-medium">
          {stateLabels[state] || state}
        </p>
      </div>

      {state !== "disconnected" && (
        <DisconnectButton className="mt-8 px-8 py-3 border border-primary text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all font-semibold">
          End Session
        </DisconnectButton>
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

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/connection-details");
      if (!res.ok) throw new Error("Failed to connect to the memory assistant.");
      const details = await res.json();
      setConnectionDetails(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnectionDetails(null);
  }, []);

  useEffect(() => {
    // Data channel listener
  }, [_onWorldGenerated]);

  if (error) {
    return (
      <div className="text-center space-y-6 py-12 border-b border-t border-slate-100 my-8">
        <p className="text-xs uppercase tracking-widest text-red-600">{error}</p>
        <button
          onClick={() => setError(null)}
          className="px-8 py-3 border border-primary text-xs uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all font-bold"
        >
          Reset Connection
        </button>
      </div>
    );
  }

  if (!connectionDetails) {
    return (
      <div className="text-center space-y-12 py-12">
        <div className="space-y-4">
          <h2 className="text-sm font-bold tracking-widest uppercase text-primary">
            Memory Assistant
          </h2>
          <p className="text-xs text-muted max-w-sm mx-auto uppercase tracking-widest leading-loose font-medium">
            Wake up your memories. Talk to the assistant to rediscover your past.
          </p>
        </div>
        
        <button
          onClick={connect}
          disabled={isConnecting}
          className={`px-12 py-4 text-xs tracking-widest uppercase transition-all duration-300 font-bold border ${
            isConnecting
              ? "border-slate-200 text-muted cursor-wait"
              : "bg-primary text-white border-primary hover:bg-primary-dark hover:shadow-lg hover:shadow-primary/20 cursor-pointer"
          }`}
        >
          {isConnecting ? "Waking up..." : "Initiate Recall"}
        </button>
      </div>
    );
  }


  return (
    <LiveKitRoom
      serverUrl={connectionDetails.serverUrl}
      token={connectionDetails.participantToken}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={disconnect}
      className="flex flex-col items-center"
    >
      <VoiceAgent />
    </LiveKitRoom>
  );
}

