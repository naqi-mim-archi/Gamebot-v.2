import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, Minimize2, Loader2, Share2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getGameById, incrementPlayCount, SavedGame } from '../services/db';
import { bundleForPreview } from '../services/geminiService';

export default function PlayShowcaseGame() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<SavedGame | null>(null);
  const [creatorName, setCreatorName] = useState<string>('Unknown Creator');
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!id) return;
    
    let isMounted = true;
    
    async function loadGame() {
      try {
        const fetchedGame = await getGameById(id!);
        if (!fetchedGame) {
          if (isMounted) setLoading(false);
          return;
        }

        if (isMounted) {
          setGame(fetchedGame);
          // Increment the view/play count
          incrementPlayCount(id!);
        }

        // Fetch creator's display name
        const userSnap = await getDoc(doc(db, 'users', fetchedGame.userId));
        if (userSnap.exists() && isMounted) {
          setCreatorName(userSnap.data().displayName || 'Anonymous');
        }
      } catch (err) {
        console.error("Failed to load game:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadGame();
    return () => { isMounted = false; };
  }, [id]);

  useEffect(() => {
    if (!game || !iframeRef.current) return;
    
    // Bundle the game files and inject into iframe
    const html = bundleForPreview(game.files);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    iframeRef.current.src = url;
    
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [game]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-4xl font-display font-bold mb-4">Game Not Found</h1>
        <p className="text-zinc-400 mb-8">This game might be private, deleted, or the link is invalid.</p>
        <button 
          onClick={() => navigate('/showcase')} 
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
        >
          Return to Showcase
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
      
      {/* Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 sm:px-6 bg-zinc-950/80 backdrop-blur-md z-40">
        <button 
          onClick={() => navigate('/showcase')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="hidden sm:inline font-medium">Showcase</span>
        </button>
        
        <div className="flex-1 min-w-0 px-4 text-center">
          <h1 className="font-display font-bold text-sm sm:text-base text-zinc-100 truncate max-w-md mx-auto">
            {game.title || `Game by ${creatorName}`}
          </h1>
          <p className="text-xs text-zinc-500 truncate">
            {game.prompt.length > 60 ? game.prompt.substring(0, 60) + '...' : game.prompt}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={handleShare}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors relative"
            title="Share Game"
          >
            <Share2 className="w-5 h-5" />
            {copied && (
              <span className="absolute -bottom-8 right-0 bg-emerald-500 text-zinc-950 text-xs font-bold px-2 py-1 rounded-md shadow-lg">
                Copied!
              </span>
            )}
          </button>
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Game Container */}
      <main className={`flex-1 flex items-center justify-center p-4 sm:p-6 z-10 ${isFullscreen ? 'fixed inset-0 z-50 bg-black p-0' : ''}`}>
        {isFullscreen && (
          <button 
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-colors shadow-2xl border border-white/20"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
        )}
        
        <div className={`w-full max-w-6xl aspect-[16/10] sm:aspect-video bg-black rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative ${isFullscreen ? 'max-w-none h-full rounded-none border-none aspect-auto' : ''}`}>
<iframe
  ref={iframeRef}
  sandbox="allow-scripts allow-same-origin"
  allow="autoplay; fullscreen"
  className="w-full h-full border-none bg-black"
  title="game viewport"
/>
        </div>
      </main>
    </div>
  );
}