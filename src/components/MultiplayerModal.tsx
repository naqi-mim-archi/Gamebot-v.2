import React, { useState } from "react";
import { X, Users, Copy, Check, Loader2, ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useMultiplayer, MPStatus } from "../hooks/useMultiplayer";

interface Props {
  mp: ReturnType<typeof useMultiplayer>;
  onClose: () => void;
}

type Screen = "menu" | "host" | "join";

export default function MultiplayerModal({ mp, onClose }: Props) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState("");

  // ── Host flow ──────────────────────────────────────────────────────────────
  async function handleHost() {
    setScreen("host");
    setActionError("");
    try {
      await mp.createRoom();
    } catch {
      setActionError("Failed to create room. Please try again.");
    }
  }

  function handleCopy() {
    if (mp.roomCode) {
      navigator.clipboard.writeText(mp.roomCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  // ── Join flow ──────────────────────────────────────────────────────────────
  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 6) { setJoinError("Please enter a 6-character room code."); return; }
    setJoinError("");
    setActionError("");
    try {
      await mp.joinRoom(code);
    } catch (err: any) {
      setJoinError(err.message || "Could not join. Check the code and try again.");
    }
  }

  const statusLabel: Record<MPStatus, string> = {
    idle: "",
    connecting: "Connecting...",
    waiting: screen === "host" ? "Waiting for opponent to join..." : "Waiting for host...",
    ready: "Both players connected!",
    disconnected: "Opponent disconnected.",
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
            {screen !== "menu" && mp.status === "idle" && (
              <button
                onClick={() => { setScreen("menu"); setJoinCode(""); setJoinError(""); setActionError(""); }}
                className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white flex-1">Multiplayer</h2>
            <button
              onClick={() => { mp.disconnect(); onClose(); }}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 flex flex-col gap-4">
            <AnimatePresence mode="wait" initial={false}>

              {/* ── Menu ── */}
              {screen === "menu" && (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  className="flex flex-col gap-3"
                >
                  <p className="text-xs text-zinc-400 leading-relaxed text-center">
                    Play online with a friend — one of you creates a room, the other joins with the code.
                  </p>
                  <button
                    onClick={handleHost}
                    className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30"
                  >
                    <Wifi className="w-4 h-4" />
                    Host a Game
                  </button>
                  <button
                    onClick={() => setScreen("join")}
                    className="w-full py-3 rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Join a Game
                  </button>
                </motion.div>
              )}

              {/* ── Host screen ── */}
              {screen === "host" && (
                <motion.div
                  key="host"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  className="flex flex-col gap-4"
                >
                  {mp.status === "connecting" && (
                    <div className="flex items-center justify-center gap-2 py-6 text-zinc-400 text-sm">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating room...
                    </div>
                  )}

                  {(mp.status === "waiting" || mp.status === "ready") && mp.roomCode && (
                    <>
                      <div className="text-center">
                        <p className="text-xs text-zinc-500 mb-2">Share this code with your friend</p>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-4xl font-black tracking-[0.2em] text-white font-mono">
                            {mp.roomCode}
                          </span>
                          <button
                            onClick={handleCopy}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                            title="Copy code"
                          >
                            {copied
                              ? <Check className="w-4 h-4 text-emerald-400" />
                              : <Copy className="w-4 h-4 text-zinc-400" />
                            }
                          </button>
                        </div>
                      </div>

                      <StatusBadge status={mp.status} label={statusLabel[mp.status]} />

                      {mp.status === "ready" && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-center text-xs text-emerald-400 font-semibold"
                        >
                          Starting game...
                        </motion.div>
                      )}
                    </>
                  )}

                  {actionError && (
                    <p className="text-xs text-red-400 text-center">{actionError}</p>
                  )}
                </motion.div>
              )}

              {/* ── Join screen ── */}
              {screen === "join" && (
                <motion.div
                  key="join"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  className="flex flex-col gap-3"
                >
                  {(mp.status === "idle" || mp.status === "connecting") && (
                    <>
                      <p className="text-xs text-zinc-400 text-center">Enter the 6-character code your friend shared</p>
                      <input
                        type="text"
                        maxLength={6}
                        value={joinCode}
                        onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                        placeholder="ABCD12"
                        className="w-full text-center text-2xl font-black tracking-[0.25em] font-mono bg-white/5 border border-white/10 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/15 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 outline-none transition-all uppercase"
                        autoFocus
                      />
                      {joinError && <p className="text-xs text-red-400 text-center">{joinError}</p>}
                      <button
                        onClick={handleJoin}
                        disabled={mp.status === "connecting"}
                        className="w-full py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white transition-all flex items-center justify-center gap-2"
                      >
                        {mp.status === "connecting"
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Joining...</>
                          : "Join Room"
                        }
                      </button>
                    </>
                  )}

                  {mp.status === "waiting" && (
                    <StatusBadge status={mp.status} label={statusLabel[mp.status]} />
                  )}

                  {mp.status === "ready" && (
                    <>
                      <StatusBadge status={mp.status} label={statusLabel[mp.status]} />
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-xs text-emerald-400 font-semibold"
                      >
                        Starting game...
                      </motion.div>
                    </>
                  )}

                  {mp.status === "disconnected" && (
                    <div className="flex flex-col items-center gap-3 py-4">
                      <WifiOff className="w-8 h-8 text-red-400" />
                      <p className="text-sm text-red-400 text-center">Opponent disconnected.</p>
                      <button
                        onClick={() => { setScreen("menu"); setJoinCode(""); mp.disconnect(); }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                      >
                        Back to menu
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatusBadge({ status, label }: { status: MPStatus; label: string }) {
  const color =
    status === "ready" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
    : status === "disconnected" ? "bg-red-500/15 border-red-500/30 text-red-400"
    : "bg-zinc-800 border-white/10 text-zinc-400";

  return (
    <div className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${color}`}>
      {status === "waiting" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {status === "ready" && (
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      )}
      {label}
    </div>
  );
}
