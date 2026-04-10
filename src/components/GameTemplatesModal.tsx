import React, { useState } from 'react';
import { X, Search, LayoutTemplate } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Template {
  id: string;
  icon: string;
  name: string;
  desc: string;
  tags: string[];
  prompt: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'platformer',
    icon: '🏃',
    name: 'Platformer',
    desc: 'Side-scrolling run & jump adventure',
    tags: ['2D', 'Action'],
    prompt: 'Create a 2D side-scrolling platformer with a hero that runs, jumps, and collects coins. Include enemies to avoid, multiple platforms, particle effects on jump/land, and a score system. Pixel art aesthetic.',
  },
  {
    id: 'space-shooter',
    icon: '🚀',
    name: 'Space Shooter',
    desc: 'Arcade shoot-em-up in space',
    tags: ['2D', 'Arcade'],
    prompt: 'Create a top-down space shooter. Player ship moves with WASD/arrows, shoots with spacebar. Waves of enemy ships, power-ups, explosions with particles, high score tracking. Neon/retro aesthetic.',
  },
  {
    id: 'puzzle',
    icon: '🧩',
    name: 'Puzzle',
    desc: 'Match or slide puzzle challenge',
    tags: ['2D', 'Puzzle'],
    prompt: 'Create a sliding tile puzzle game. 4x4 grid, numbered tiles, shuffle button, move counter, timer, win detection with confetti animation. Clean minimal UI.',
  },
  {
    id: 'racing',
    icon: '🏎️',
    name: 'Racing',
    desc: 'Top-down or 3D racing game',
    tags: ['3D', 'Racing'],
    prompt: 'Create a 3D top-down racing game. Car controlled with arrow keys, track with curves and obstacles, lap timer, opponent AI car, speed boost pickups. Arcade physics.',
  },
  {
    id: 'tower-defense',
    icon: '🏰',
    name: 'Tower Defense',
    desc: 'Place towers to stop enemy waves',
    tags: ['2D', 'Strategy'],
    prompt: 'Create a tower defense game on a grid. Player places towers (3 types: basic, sniper, splash) on a path to stop waves of enemies. Enemies have health bars, towers have range indicators. Gold economy system.',
  },
  {
    id: 'rpg',
    icon: '⚔️',
    name: 'RPG',
    desc: 'Top-down adventure with combat',
    tags: ['2D', 'RPG'],
    prompt: 'Create a top-down 2D RPG. Hero explores a dungeon, fights enemies with sword attacks, collects items, has HP/XP/level system. Multiple enemy types, simple inventory UI.',
  },
  {
    id: 'endless-runner',
    icon: '🌵',
    name: 'Endless Runner',
    desc: 'Dodge obstacles forever',
    tags: ['2D', 'Arcade'],
    prompt: 'Create an endless runner game. Character auto-runs, player taps/clicks to jump over obstacles. Speed increases over time, distance score, death/restart screen with best score. Smooth animations.',
  },
  {
    id: 'match3',
    icon: '💎',
    name: 'Match 3',
    desc: 'Swap gems to match 3 or more',
    tags: ['2D', 'Casual'],
    prompt: 'Create a match-3 puzzle game like Candy Crush. 8x8 grid of colored gems, swap adjacent gems to match 3+, chain reactions, score multiplier, 30-second rounds.',
  },
  {
    id: 'snake',
    icon: '🐍',
    name: 'Snake',
    desc: 'Classic snake with a twist',
    tags: ['2D', 'Classic'],
    prompt: 'Create a modern Snake game. Snake grows when eating food, dies on wall/self collision. Speed increases with length, neon visual style with glow effects, high score persistence via localStorage.',
  },
  {
    id: 'flappy',
    icon: '🐦',
    name: 'Flappy Style',
    desc: 'Tap to fly through gaps',
    tags: ['2D', 'Casual'],
    prompt: 'Create a Flappy Bird-style game. Tap/click/space to flap, avoid pipes, score per pipe passed, parallax background, juice on score (screen flash), game over with best score.',
  },
  {
    id: 'breakout',
    icon: '🧱',
    name: 'Breakout',
    desc: 'Ball and paddle brick breaker',
    tags: ['2D', 'Classic'],
    prompt: 'Create a Breakout/Arkanoid game. Paddle controlled by mouse/touch, ball bounces off bricks, 5 levels of increasing difficulty, power-ups (wide paddle, multi-ball, slow), lives system.',
  },
  {
    id: 'memory',
    icon: '🃏',
    name: 'Memory',
    desc: 'Card flip memory challenge',
    tags: ['2D', 'Puzzle'],
    prompt: 'Create a card memory game. 4x4 grid of face-down cards with emoji pairs, flip two to match, matched pairs stay face up, move counter, timer, win animation with confetti.',
  },
];

const TAG_COLORS: Record<string, string> = {
  '2D': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  '3D': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  Action: 'bg-red-500/15 text-red-400 border-red-500/20',
  Arcade: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  Puzzle: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
  Racing: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Strategy: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  RPG: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  Casual: 'bg-lime-500/15 text-lime-400 border-lime-500/20',
  Classic: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/20',
};

interface Props {
  onSelect: (prompt: string) => void;
  onClose: () => void;
  hasSteam?: boolean;
  onSteamLibrary?: () => void;
}

export default function GameTemplatesModal({ onSelect, onClose, hasSteam, onSteamLibrary }: Props) {
  const [search, setSearch] = useState('');

  const filtered = TEMPLATES.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.tags.some(g => g.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-zinc-950 border border-white/10 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 shrink-0">
            <LayoutTemplate className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white font-display flex-1">Choose a Template</h2>
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search templates..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
                autoFocus
              />
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Grid */}
          <div className="overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map(t => (
              <button
                key={t.id}
                onClick={() => { onSelect(t.prompt); onClose(); }}
                className="group text-left bg-zinc-900/60 hover:bg-zinc-800/80 border border-white/5 hover:border-white/15 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:border-emerald-500/40"
              >
                <div className="text-2xl mb-2">{t.icon}</div>
                <p className="text-sm font-semibold text-white mb-0.5">{t.name}</p>
                <p className="text-[11px] text-zinc-500 mb-2 leading-relaxed">{t.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {t.tags.map(tag => (
                    <span
                      key={tag}
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${TAG_COLORS[tag] || 'bg-white/5 text-zinc-400 border-white/10'}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}

            {/* Steam Library card */}
            {hasSteam && (
              <button
                onClick={() => { onClose(); onSteamLibrary?.(); }}
                className="group text-left bg-gradient-to-br from-sky-950/60 to-zinc-900/60 hover:from-sky-900/60 hover:to-zinc-800/60 border border-sky-500/15 hover:border-sky-500/30 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none"
              >
                <div className="text-2xl mb-2">🎮</div>
                <p className="text-sm font-semibold text-white mb-0.5">Steam Library</p>
                <p className="text-[11px] text-zinc-500 mb-2 leading-relaxed">Pick a game from your Steam library as inspiration</p>
                <div className="flex flex-wrap gap-1">
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium border bg-sky-500/15 text-sky-400 border-sky-500/20">Steam</span>
                </div>
              </button>
            )}

            {filtered.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-500 text-sm">
                No templates match "{search}"
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
