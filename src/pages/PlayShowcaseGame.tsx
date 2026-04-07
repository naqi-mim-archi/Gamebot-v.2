import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, Minimize2 } from 'lucide-react';
import { NeonSnake, CosmicClicker, PhysicsPuzzle, DungeonCrawler, RhythmJump, SpaceTycoon } from './ShowcaseGames';

const GAMES = {
  'neon-racer': NeonSnake, // Using NeonSnake for Neon Racer
  'cosmic-defender': CosmicClicker,
  'physics-puzzle': PhysicsPuzzle,
  'dungeon-crawler': DungeonCrawler,
  'rhythm-jump': RhythmJump,
  'space-tycoon': SpaceTycoon,
};

export default function PlayShowcaseGame() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const GameComponent = id ? GAMES[id as keyof typeof GAMES] : null;

  useEffect(() => {
    // Increment play count in local storage to simulate real players
    if (id) {
      const currentCount = parseInt(localStorage.getItem(`playcount_${id}`) || '0');
      localStorage.setItem(`playcount_${id}`, (currentCount + 1).toString());
    }
  }, [id]);

  if (!GameComponent) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Game Not Found</h1>
        <button onClick={() => navigate('/showcase')} className="text-emerald-400 hover:text-emerald-300">
          Return to Showcase
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-zinc-950/50 backdrop-blur-md z-50">
        <button 
          onClick={() => navigate('/showcase')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Showcase</span>
        </button>
        
        <div className="flex items-center gap-4">
          <h1 className="font-display font-bold text-lg capitalize">{id?.replace('-', ' ')}</h1>
        </div>

        <button 
          onClick={() => setIsFullscreen(!isFullscreen)}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </header>

      {/* Game Container */}
      <main className={`flex-1 flex items-center justify-center p-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-black p-0' : ''}`}>
        {isFullscreen && (
          <button 
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white backdrop-blur-md transition-colors"
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        )}
        <div className={`w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative ${isFullscreen ? 'max-w-none h-full rounded-none border-none' : ''}`}>
          <GameComponent />
        </div>
      </main>
    </div>
  );
}
