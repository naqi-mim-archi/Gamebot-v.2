/**
 * Multiplayer hook using Firebase Realtime Database.
 * Works on Vercel (no persistent server needed).
 *
 * Room structure in RTDB:  /mp-rooms/{code}/
 *   status:   'waiting' | 'ready' | 'closed'
 *   p0events/{pushId}: serialised game event from player 0
 *   p1events/{pushId}: serialised game event from player 1
 */
import { useEffect, useRef, useCallback, useState } from "react";
import {
  ref, set, push, onValue, onDisconnect, remove, off, get, DataSnapshot,
} from "firebase/database";
import { rtdb } from "../services/firebase";

export type MPStatus =
  | "idle"
  | "connecting"
  | "waiting"       // host created room, waiting for opponent
  | "ready"         // both players in room
  | "disconnected";

interface UseMultiplayerOptions {
  onEvent?: (data: unknown) => void;
  onReady?: (playerIndex: 0 | 1) => void;
  onOpponentDisconnected?: () => void;
}

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode(): string {
  let c = "";
  for (let i = 0; i < 6; i++) c += CHARS[Math.floor(Math.random() * CHARS.length)];
  return c;
}

export function useMultiplayer(options: UseMultiplayerOptions = {}) {
  const [status, setStatus] = useState<MPStatus>("idle");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [playerIndex, setPlayerIndex] = useState<0 | 1 | null>(null);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Track unsubscribe handles so we can clean up
  const unsubsRef = useRef<Array<() => void>>([]);
  const codeRef = useRef<string | null>(null);
  const pIdxRef = useRef<0 | 1 | null>(null);

  function cleanup() {
    unsubsRef.current.forEach(fn => fn());
    unsubsRef.current = [];
  }

  // ── Subscribe to opponent's event stream ─────────────────────────────────────
  function subscribeToEvents(code: string, myIndex: 0 | 1) {
    const opponentPath = myIndex === 0 ? "p1events" : "p0events";
    const eventsRef = ref(rtdb, `mp-rooms/${code}/${opponentPath}`);

    // Track seen keys so we don't re-fire old events on reconnect
    const seen = new Set<string>();

    const unsub = onValue(eventsRef, (snap: DataSnapshot) => {
      if (!snap.exists()) return;
      snap.forEach(child => {
        if (!seen.has(child.key!)) {
          seen.add(child.key!);
          optionsRef.current.onEvent?.(child.val());
        }
      });
    });

    unsubsRef.current.push(() => off(eventsRef, "value", unsub as any));
  }

  // ── Watch room status ─────────────────────────────────────────────────────────
  function watchStatus(code: string, myIndex: 0 | 1) {
    const statusRef = ref(rtdb, `mp-rooms/${code}/status`);
    const unsub = onValue(statusRef, (snap: DataSnapshot) => {
      const val = snap.val();
      if (val === "ready") {
        setStatus("ready");
        optionsRef.current.onReady?.(myIndex);
      }
      if (val === "closed") {
        setStatus("disconnected");
        optionsRef.current.onOpponentDisconnected?.();
        cleanup();
      }
    });
    unsubsRef.current.push(() => off(statusRef, "value", unsub as any));
  }

  // ── Create room (host = player 0) ─────────────────────────────────────────────
  const createRoom = useCallback(async (): Promise<string> => {
    setStatus("connecting");
    const code = makeCode();
    const roomRef = ref(rtdb, `mp-rooms/${code}`);

    await set(roomRef, { status: "waiting" });

    // Auto-close room if host disconnects
    onDisconnect(ref(rtdb, `mp-rooms/${code}/status`)).set("closed");

    codeRef.current = code;
    pIdxRef.current = 0;
    setRoomCode(code);
    setPlayerIndex(0);
    setStatus("waiting");

    watchStatus(code, 0);
    subscribeToEvents(code, 0);

    return code;
  }, []);

  // ── Join room (guest = player 1) ──────────────────────────────────────────────
  const joinRoom = useCallback(async (code: string): Promise<{ playerIndex: 0 | 1 }> => {
    const upper = code.toUpperCase();
    setStatus("connecting");

    const statusSnap = await get(ref(rtdb, `mp-rooms/${upper}/status`));
    if (!statusSnap.exists()) throw new Error("Room not found");
    if (statusSnap.val() === "ready") throw new Error("Room is full");
    if (statusSnap.val() === "closed") throw new Error("Room is closed");

    // Mark room ready
    await set(ref(rtdb, `mp-rooms/${upper}/status`), "ready");

    // Auto-close room if guest disconnects
    onDisconnect(ref(rtdb, `mp-rooms/${upper}/status`)).set("closed");

    codeRef.current = upper;
    pIdxRef.current = 1;
    setRoomCode(upper);
    setPlayerIndex(1);
    setStatus("waiting"); // watchStatus will immediately fire "ready"

    watchStatus(upper, 1);
    subscribeToEvents(upper, 1);

    return { playerIndex: 1 };
  }, []);

  // ── Send a game event ─────────────────────────────────────────────────────────
  const sendEvent = useCallback((data: unknown) => {
    const code = codeRef.current;
    const pIdx = pIdxRef.current;
    if (code === null || pIdx === null) return;
    const eventsRef = ref(rtdb, `mp-rooms/${code}/p${pIdx}events`);
    push(eventsRef, data);
  }, []);

  // ── Signal game loaded (no-op in RTDB model — status drives ready) ────────────
  const signalReady = useCallback(() => {}, []);

  // ── Disconnect ────────────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    const code = codeRef.current;
    cleanup();
    if (code) {
      set(ref(rtdb, `mp-rooms/${code}/status`), "closed").catch(() => {});
    }
    codeRef.current = null;
    pIdxRef.current = null;
    setStatus("idle");
    setRoomCode(null);
    setPlayerIndex(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), []);

  return { status, roomCode, playerIndex, createRoom, joinRoom, sendEvent, signalReady, disconnect };
}
