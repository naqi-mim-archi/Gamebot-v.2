import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Loader2, Gamepad2, Clock, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';

interface SteamGame {
  appId: string;
  name: string;
  hours: number;
  headerImage: string;
}

interface SteamLibraryModalProps {
  steamId: string;
  steamUsername?: string;
  onSelect: (prompt: string) => void;
  onClose: () => void;
}

export default function SteamLibraryModal({
  steamId,
  steamUsername,
  onSelect,
  onClose,
}: SteamLibraryModalProps) {
  const [games, setGames] = useState<SteamGame[]>([]);
  const [filtered, setFiltered] = useState<SteamGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SteamGame | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`/api/steam/library?steamId=${encodeURIComponent(steamId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setGames(data.games);
        setFiltered(data.games);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [steamId]);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    setFiltered(q ? games.filter(g => g.name.toLowerCase().includes(q)) : games);
  }, [search, games]);

  // Focus search after load
  useEffect(() => {
    if (!loading && !error) setTimeout(() => searchRef.current?.focus(), 100);
  }, [loading, error]);

  const handleUseGame = (game: SteamGame) => {
    const prompt = `Create a game inspired by "${game.name}". Capture its core gameplay loop, visual style, and feel. Make it playable in the browser using HTML5 Canvas or JavaScript.`;
    onSelect(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col"
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Steam Library</h2>
            {steamUsername && <p className="text-xs text-zinc-500">{steamUsername} · {games.length} games</p>}
          </div>
          <button onClick={onClose} className="ml-auto text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        {!loading && !error && (
          <div className="px-4 py-3 border-b border-white/5 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search your library..."
                className="w-full bg-zinc-800/60 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500/50"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-sm text-zinc-400">Loading your Steam library...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center px-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
              <div>
                <p className="text-sm font-medium text-white mb-1">Couldn't load library</p>
                <p className="text-xs text-zinc-400">{error}</p>
              </div>
              {error.includes('private') && (
                <a
                  href="https://store.steampowered.com/account/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Steam Privacy Settings
                </a>
              )}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Gamepad2 className="w-10 h-10 text-zinc-600" />
              <p className="text-sm text-zinc-400">No games match "{search}"</p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map(game => (
                <motion.div
                  key={game.appId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all ${
                    selected?.appId === game.appId
                      ? 'border-sky-500/70 ring-1 ring-sky-500/40'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                  onClick={() => setSelected(game)}
                  onDoubleClick={() => handleUseGame(game)}
                >
                  {/* Game cover */}
                  <div className="relative aspect-[460/215] bg-zinc-800 overflow-hidden">
                    <img
                      src={game.headerImage}
                      alt={game.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      onError={e => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                    {/* Hours badge */}
                    {game.hours > 0 && (
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                        <Clock className="w-2.5 h-2.5 text-zinc-300" />
                        <span className="text-[10px] text-zinc-300 font-mono">
                          {game.hours >= 1000
                            ? `${(game.hours / 1000).toFixed(1)}k`
                            : game.hours.toFixed(0)}h
                        </span>
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-sky-500/0 group-hover:bg-sky-500/10 transition-colors" />
                  </div>

                  {/* Game name */}
                  <div className="px-2 py-1.5 bg-zinc-900">
                    <p className="text-xs text-zinc-200 truncate font-medium">{game.name}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer — appears when a game is selected */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="px-4 py-3 border-t border-white/5 flex items-center gap-3 shrink-0"
            >
              <img
                src={selected.headerImage}
                alt={selected.name}
                className="w-16 h-8 rounded object-cover border border-white/10"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{selected.name}</p>
                <p className="text-[10px] text-zinc-500">Double-click or press "Use as Inspiration"</p>
              </div>
              <button
                onClick={() => handleUseGame(selected)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-[0_0_12px_rgba(14,165,233,0.3)] shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Use as Inspiration
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
