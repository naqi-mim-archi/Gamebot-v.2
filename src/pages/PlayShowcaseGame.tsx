import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, Minimize2, Loader2, Share2, GitFork, Users } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getGameById, incrementPlayCount, SavedGame } from '../services/db';
import { bundleForPreview } from '../services/geminiService';
import MultiplayerModal from '../components/MultiplayerModal';
import { useMultiplayer } from '../hooks/useMultiplayer';

export default function PlayShowcaseGame() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<SavedGame | null>(null);
  const [gameHtml, setGameHtml] = useState('');
  const [creatorName, setCreatorName] = useState<string>('Unknown Creator');
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mpOpen, setMpOpen] = useState(false);
  const [mpActive, setMpActive] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const mp = useMultiplayer({
    onEvent: (data) => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'MP_RECV', data }, '*');
    },
    onReady: (playerIndex) => {
      setMpOpen(false);
      setMpActive(true);
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage({ type: 'MP_INIT', playerIndex }, '*');
      }, 300);
    },
    onOpponentDisconnected: () => {
      setMpActive(false);
    },
  });

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
          setGameHtml(bundleForPreview(fetchedGame.files));
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


  const containerRef = useRef<HTMLDivElement>(null);

  const handleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;

    if (!document.fullscreenElement) {
      try {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
        else setIsFullscreen(true); // CSS fallback
      } catch { setIsFullscreen(true); }
    } else {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
      else setIsFullscreen(false);
    }
  };

  // Listen for native fullscreen change (ESC key etc)
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Listen for outgoing game events from iframe → relay via Socket.io
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'MP_SEND') mp.sendEvent(d.data);
      if (d.type === 'MP_GAME_LOADED') mp.signalReady();
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [mp]);

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
          {/* Play with Friend */}
          <button
            onClick={() => setMpOpen(true)}
            title="Play with a friend online"
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              mpActive
                ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300'
                : 'bg-fuchsia-500/10 border-fuchsia-500/25 text-fuchsia-400 hover:bg-fuchsia-500/20 hover:border-fuchsia-500/40'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            {mpActive ? 'Online' : 'Play with Friend'}
          </button>
          {/* Spin Off */}
          {game && (
            <button
              onClick={() => navigate('/app', { state: { loadGame: game, isSpinOff: true } })}
              title="Spin Off — fork this game and improve it"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all"
            >
              <GitFork className="w-3.5 h-3.5" />
              Spin Off
            </button>
          )}
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
            onClick={handleFullscreen}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Game Container */}
      <main ref={containerRef} className={`flex-1 flex items-center justify-center p-4 sm:p-6 z-10 ${isFullscreen ? 'fixed inset-0 z-50 bg-black p-0' : ''}`}>
        {isFullscreen && (
          <button 
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 z-50 p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-colors shadow-2xl border border-white/20"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
        )}
        
        <div className={`w-full max-w-6xl aspect-[16/10] sm:aspect-video rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative ${isFullscreen ? 'max-w-none h-full rounded-none border-none aspect-auto' : ''}`}>
          <iframe
            key={gameHtml.length}
            ref={iframeRef}
            srcDoc={gameHtml}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-downloads"
            allow="fullscreen; accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; payment; usb; autoplay"
            allowFullScreen
            className="w-full h-full border-0 bg-white block"
            style={{ backgroundColor: 'white' }}
            title="game viewport"
          />
        </div>
      </main>
      {mpOpen && (
        <MultiplayerModal
          mp={mp}
          onClose={() => setMpOpen(false)}
        />
      )}
    </div>
  );
}