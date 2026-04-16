import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

export type MPStatus =
  | "idle"
  | "connecting"
  | "waiting"   // host created room, waiting for opponent
  | "ready"     // both players in room
  | "disconnected";

interface UseMultiplayerOptions {
  onEvent?: (data: unknown) => void;
  onReady?: (playerIndex: 0 | 1) => void;
  onOpponentDisconnected?: () => void;
}

export function useMultiplayer(options: UseMultiplayerOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<MPStatus>("idle");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerIndex, setPlayerIndex] = useState<0 | 1 | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Connect on first use
  function ensureConnected(): Socket {
    if (!socketRef.current || !socketRef.current.connected) {
      const socket = io(window.location.origin, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
      });
      socketRef.current = socket;

      socket.on("room_ready", () => {
        setStatus("ready");
        if (playerIndex !== null) optionsRef.current.onReady?.(playerIndex);
      });

      socket.on("game_event", (data: unknown) => {
        optionsRef.current.onEvent?.(data);
      });

      socket.on("opponent_disconnected", () => {
        setStatus("disconnected");
        optionsRef.current.onOpponentDisconnected?.();
      });

      socket.on("opponent_ready", () => {
        // opponent's game loaded — no-op for now
      });
    }
    return socketRef.current;
  }

  const createRoom = useCallback((): Promise<string> => {
    setStatus("connecting");
    return new Promise((resolve, reject) => {
      const socket = ensureConnected();
      socket.emit("create_room", (code: string) => {
        if (!code) { reject(new Error("Failed to create room")); return; }
        setRoomCode(code);
        setPlayerIndex(0);
        setStatus("waiting");
        resolve(code);
      });
    });
  }, []);

  const joinRoom = useCallback((code: string): Promise<{ playerIndex: 0 | 1 }> => {
    setStatus("connecting");
    return new Promise((resolve, reject) => {
      const socket = ensureConnected();
      socket.emit("join_room", code.toUpperCase(), (result: { ok: boolean; playerIndex?: number; error?: string }) => {
        if (!result.ok) { reject(new Error(result.error || "Failed to join")); return; }
        const idx = (result.playerIndex ?? 1) as 0 | 1;
        setPlayerIndex(idx);
        setRoomCode(code.toUpperCase());
        setStatus("waiting");
        resolve({ playerIndex: idx });
      });
    });
  }, []);

  const sendEvent = useCallback((data: unknown) => {
    socketRef.current?.emit("game_event", data);
  }, []);

  const signalReady = useCallback(() => {
    socketRef.current?.emit("player_ready");
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus("idle");
    setRoomCode(null);
    setPlayerIndex(null);
  }, []);

  // Also handle room_ready with playerIndex for the host (who already has index 0)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const handler = () => {
      setStatus("ready");
      if (playerIndex !== null) optionsRef.current.onReady?.(playerIndex);
    };
    socket.on("room_ready", handler);
    return () => { socket.off("room_ready", handler); };
  }, [playerIndex]);

  return { status, roomCode, playerIndex, createRoom, joinRoom, sendEvent, signalReady, disconnect };
}
