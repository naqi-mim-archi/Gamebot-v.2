import React, { useState, useEffect, useCallback, useRef } from 'react';

// --- Game 1: Neon Snake ---
export function NeonSnake() {
  const GRID_SIZE = 20;
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState({ x: 0, y: -1 });
  const [food, setFood] = useState({ x: 15, y: 5 });
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const moveSnake = useCallback(() => {
    if (gameOver) return;
    setSnake(prev => {
      const head = prev[0];
      const newHead = { x: head.x + direction.x, y: head.y + direction.y };
      
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE || prev.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        return prev;
      }

      const newSnake = [newHead, ...prev];
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood({ x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) });
      } else {
        newSnake.pop();
      }
      return newSnake;
    });
  }, [direction, food, gameOver]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': if (direction.y === 0) setDirection({ x: 0, y: -1 }); break;
        case 'ArrowDown': if (direction.y === 0) setDirection({ x: 0, y: 1 }); break;
        case 'ArrowLeft': if (direction.x === 0) setDirection({ x: -1, y: 0 }); break;
        case 'ArrowRight': if (direction.x === 0) setDirection({ x: 1, y: 0 }); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  useEffect(() => {
    const interval = setInterval(moveSnake, 120);
    return () => clearInterval(interval);
  }, [moveSnake]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#050505] text-white p-4 font-mono">
      <div className="mb-6 text-3xl font-bold text-fuchsia-500 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]">SCORE: {score}</div>
      <div className="relative bg-zinc-950 border-2 border-fuchsia-500/30 rounded-lg overflow-hidden shadow-[0_0_40px_rgba(217,70,239,0.15)]" style={{ width: 400, height: 400 }}>
        {snake.map((segment, i) => (
          <div key={i} className="absolute bg-fuchsia-500 shadow-[0_0_10px_rgba(217,70,239,0.8)]" style={{ left: segment.x * 20, top: segment.y * 20, width: 20, height: 20, borderRadius: i === 0 ? 6 : 2 }} />
        ))}
        <div className="absolute bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.9)]" style={{ left: food.x * 20, top: food.y * 20, width: 20, height: 20, borderRadius: '50%' }} />
        {gameOver && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm z-10">
            <h2 className="text-4xl font-bold text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">SYSTEM FAILURE</h2>
            <button onClick={() => { setSnake([{ x: 10, y: 10 }]); setDirection({ x: 0, y: -1 }); setGameOver(false); setScore(0); }} className="px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-full font-bold transition-all shadow-[0_0_20px_rgba(217,70,239,0.4)] hover:shadow-[0_0_30px_rgba(217,70,239,0.6)] hover:scale-105">REBOOT</button>
          </div>
        )}
      </div>
      <p className="mt-8 text-zinc-500 text-sm tracking-widest">USE ARROW KEYS</p>
    </div>
  );
}

// --- Game 2: Cosmic Clicker ---
export function CosmicClicker() {
  const [asteroids, setAsteroids] = useState<{ id: number, x: number, y: number, speed: number, size: number }[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const requestRef = useRef<number>();

  useEffect(() => {
    if (gameOver) return;
    const spawnInterval = setInterval(() => {
      setAsteroids(prev => [...prev, {
        id: Date.now(),
        x: Math.random() * 80 + 10, // percentage
        y: -10,
        speed: Math.random() * 0.5 + 0.2,
        size: Math.random() * 30 + 30
      }]);
    }, 1000 - Math.min(score * 10, 800)); // Gets faster
    return () => clearInterval(spawnInterval);
  }, [gameOver, score]);

  const update = useCallback(() => {
    if (gameOver) return;
    setAsteroids(prev => {
      let hitBottom = false;
      const next = prev.map(a => {
        if (a.y > 100) hitBottom = true;
        return { ...a, y: a.y + a.speed };
      }).filter(a => a.y <= 110);
      
      if (hitBottom) setGameOver(true);
      return next;
    });
    requestRef.current = requestAnimationFrame(update);
  }, [gameOver]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  return (
    <div className="relative w-full h-full bg-[#020617] overflow-hidden flex flex-col items-center justify-center font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#020617] to-black"></div>
      
      {/* Stars background */}
      <div className="absolute inset-0 opacity-50">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="absolute bg-white rounded-full" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, width: Math.random() * 3, height: Math.random() * 3, opacity: Math.random() }} />
        ))}
      </div>

      <div className="absolute top-8 left-8 z-10 text-cyan-400 font-bold text-2xl drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
        DEFENDED: {score}
      </div>

      {asteroids.map(a => (
        <div
          key={a.id}
          onClick={() => {
            if (gameOver) return;
            setAsteroids(prev => prev.filter(ast => ast.id !== a.id));
            setScore(s => s + 1);
          }}
          className="absolute cursor-crosshair hover:scale-110 transition-transform"
          style={{ left: `${a.x}%`, top: `${a.y}%`, width: a.size, height: a.size, transform: 'translate(-50%, -50%)' }}
        >
          <div className="w-full h-full bg-orange-500 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.6)] border-2 border-orange-300 flex items-center justify-center">
            <div className="w-1/2 h-1/2 bg-orange-400 rounded-full opacity-50" />
          </div>
        </div>
      ))}

      {/* Planet at bottom */}
      <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[120%] h-[30%] bg-cyan-900 rounded-[100%] blur-md opacity-30"></div>
      <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-[100%] h-[30%] bg-gradient-to-t from-cyan-950 to-cyan-800 rounded-[100%] border-t border-cyan-500/30 shadow-[0_-10px_40px_rgba(34,211,238,0.1)]"></div>

      {gameOver && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-50">
          <h2 className="text-5xl font-bold text-orange-500 mb-2 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]">PLANET DESTROYED</h2>
          <p className="text-zinc-400 mb-8 text-xl">Asteroids destroyed: {score}</p>
          <button onClick={() => { setAsteroids([]); setGameOver(false); setScore(0); }} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-bold transition-all shadow-[0_0_20px_rgba(34,211,238,0.4)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] hover:scale-105">DEPLOY NEW SHIELD</button>
        </div>
      )}
    </div>
  );
}

// --- Game 3: Physics Puzzle (Simplified to a bouncing ball target game) ---
export function PhysicsPuzzle() {
  const [score, setScore] = useState(0);
  const [ball, setBall] = useState({ x: 50, y: 10, vx: 2, vy: 0 });
  const [target, setTarget] = useState({ x: 80, y: 80 });
  const [platform, setPlatform] = useState({ x: 50, w: 20 });
  const requestRef = useRef<number>();

  const update = useCallback(() => {
    setBall(prev => {
      let { x, y, vx, vy } = prev;
      vy += 0.2; // gravity
      x += vx;
      y += vy;

      // Wall collisions
      if (x < 2 || x > 98) { vx = -vx; x = x < 2 ? 2 : 98; }
      if (y < 2) { vy = -vy; y = 2; }

      // Platform collision
      if (y > 90 && y < 95 && x > platform.x - platform.w/2 && x < platform.x + platform.w/2 && vy > 0) {
        vy = -vy * 0.8; // bounce
        vx += (x - platform.x) * 0.1; // spin
        y = 90;
      }

      // Target collision
      const dist = Math.sqrt(Math.pow(x - target.x, 2) + Math.pow(y - target.y, 2));
      if (dist < 8) {
        setScore(s => s + 1);
        setTarget({ x: Math.random() * 80 + 10, y: Math.random() * 60 + 10 });
        // Reset ball to top
        return { x: 50, y: 10, vx: (Math.random() - 0.5) * 4, vy: 0 };
      }

      // Out of bounds
      if (y > 110) {
        setScore(0);
        return { x: 50, y: 10, vx: 2, vy: 0 };
      }

      return { x, y, vx, vy };
    });
    requestRef.current = requestAnimationFrame(update);
  }, [platform, target]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setPlatform(p => ({ ...p, x }));
  };

  return (
    <div className="relative w-full h-full bg-emerald-950 overflow-hidden cursor-none" onMouseMove={handleMouseMove}>
      <div className="absolute top-6 left-6 text-emerald-400 font-bold text-2xl">SCORE: {score}</div>
      
      {/* Target */}
      <div className="absolute bg-yellow-400 rounded-full shadow-[0_0_20px_rgba(250,204,21,0.8)] animate-pulse" style={{ left: `${target.x}%`, top: `${target.y}%`, width: '8%', aspectRatio: '1/1', transform: 'translate(-50%, -50%)' }} />
      
      {/* Ball */}
      <div className="absolute bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.9)]" style={{ left: `${ball.x}%`, top: `${ball.y}%`, width: '4%', aspectRatio: '1/1', transform: 'translate(-50%, -50%)' }} />
      
      {/* Platform */}
      <div className="absolute bottom-[10%] h-3 bg-emerald-400 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.6)]" style={{ left: `${platform.x}%`, width: `${platform.w}%`, transform: 'translateX(-50%)' }} />
      
      <div className="absolute bottom-4 w-full text-center text-emerald-700 text-sm font-medium pointer-events-none">Move mouse to control paddle</div>
    </div>
  );
}

// --- Game 4: Dungeon Crawler (Simplified to a grid maze with enemies) ---
export function DungeonCrawler() {
  const [player, setPlayer] = useState({ x: 1, y: 1 });
  const [goal, setGoal] = useState({ x: 8, y: 8 });
  const [level, setLevel] = useState(1);
  const GRID = 10;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setPlayer(p => {
        let { x, y } = p;
        if (e.key === 'ArrowUp' && y > 0) y--;
        if (e.key === 'ArrowDown' && y < GRID - 1) y++;
        if (e.key === 'ArrowLeft' && x > 0) x--;
        if (e.key === 'ArrowRight' && x < GRID - 1) x++;
        
        if (x === goal.x && y === goal.y) {
          setLevel(l => l + 1);
          setGoal({ x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) });
          return { x: 0, y: 0 };
        }
        return { x, y };
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goal]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#1a0f0a] text-amber-500 font-mono">
      <div className="mb-6 text-2xl font-bold drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">FLOOR {level}</div>
      <div className="relative bg-black border-4 border-amber-900/50 rounded-xl p-2 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
          {Array.from({ length: GRID * GRID }).map((_, i) => {
            const x = i % GRID;
            const y = Math.floor(i / GRID);
            const isPlayer = player.x === x && player.y === y;
            const isGoal = goal.x === x && goal.y === y;
            
            return (
              <div key={i} className="w-8 h-8 md:w-10 md:h-10 rounded-sm bg-zinc-900 flex items-center justify-center relative">
                {isGoal && <div className="absolute inset-1 bg-yellow-400 rounded-sm shadow-[0_0_15px_rgba(250,204,21,0.8)] animate-pulse" />}
                {isPlayer && <div className="absolute inset-1 bg-amber-500 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.8)] z-10" />}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-8 text-amber-900/80 text-sm">Find the glowing portal. Use arrow keys.</p>
    </div>
  );
}

// --- Game 5: Rhythm Jump ---
export function RhythmJump() {
  const [score, setScore] = useState(0);
  const [blocks, setBlocks] = useState<{id: number, y: number}[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const requestRef = useRef<number>();

  useEffect(() => {
    if (gameOver) return;
    const interval = setInterval(() => {
      setBlocks(prev => [...prev, { id: Date.now(), y: -10 }]);
    }, 800);
    return () => clearInterval(interval);
  }, [gameOver]);

  const update = useCallback(() => {
    if (gameOver) return;
    setBlocks(prev => {
      let missed = false;
      const next = prev.map(b => {
        if (b.y > 100) missed = true;
        return { ...b, y: b.y + 1.5 };
      }).filter(b => b.y <= 100);
      
      if (missed) setGameOver(true);
      return next;
    });
    requestRef.current = requestAnimationFrame(update);
  }, [gameOver]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  const handleTap = () => {
    if (gameOver) return;
    setBlocks(prev => {
      const hitIndex = prev.findIndex(b => b.y > 75 && b.y < 95);
      if (hitIndex !== -1) {
        setScore(s => s + 10);
        const next = [...prev];
        next.splice(hitIndex, 1);
        return next;
      }
      return prev;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') handleTap();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver]);

  return (
    <div className="relative w-full h-full bg-rose-950 overflow-hidden flex flex-col items-center justify-center font-sans" onClick={handleTap}>
      <div className="absolute top-8 text-rose-300 font-bold text-3xl tracking-widest">BEATS: {score}</div>
      
      {/* Target Line */}
      <div className="absolute bottom-[15%] w-full h-2 bg-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.5)]" />
      <div className="absolute bottom-[15%] w-full h-[1px] bg-rose-400" />

      {/* Falling Blocks */}
      {blocks.map(b => (
        <div key={b.id} className="absolute left-1/2 -translate-x-1/2 w-32 h-8 bg-white rounded-md shadow-[0_0_15px_rgba(255,255,255,0.8)]" style={{ top: `${b.y}%` }} />
      ))}

      {gameOver && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-md z-50">
          <h2 className="text-5xl font-bold text-rose-500 mb-6 drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]">OUT OF RHYTHM</h2>
          <button onClick={() => { setBlocks([]); setGameOver(false); setScore(0); }} className="px-8 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:scale-105">RESTART TRACK</button>
        </div>
      )}
      <div className="absolute bottom-6 text-rose-400/50 text-sm font-medium">PRESS SPACE OR CLICK WHEN BLOCKS HIT THE LINE</div>
    </div>
  );
}

// --- Game 6: Space Tycoon (Simplified to an idle clicker) ---
export function SpaceTycoon() {
  const [credits, setCredits] = useState(0);
  const [miners, setMiners] = useState(0);
  const [factories, setFactories] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCredits(c => c + (miners * 1) + (factories * 5));
    }, 1000);
    return () => clearInterval(interval);
  }, [miners, factories]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#0a0a1a] text-indigo-100 p-8 font-sans">
      <div className="text-center mb-12">
        <h2 className="text-xl text-indigo-400 font-bold tracking-widest mb-2">GALACTIC CREDITS</h2>
        <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]">
          {Math.floor(credits).toLocaleString()}
        </div>
      </div>

      <button 
        onClick={() => setCredits(c => c + 1)}
        className="w-48 h-48 rounded-full bg-gradient-to-br from-indigo-600 to-violet-800 border-4 border-indigo-400/50 shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center mb-12"
      >
        <span className="text-2xl font-bold">MINE ASTEROID</span>
      </button>

      <div className="grid grid-cols-2 gap-6 w-full max-w-md">
        <div className="bg-indigo-950/50 border border-indigo-500/20 p-4 rounded-2xl flex flex-col items-center">
          <div className="text-lg font-bold mb-1">Auto-Miners ({miners})</div>
          <div className="text-sm text-indigo-400 mb-4">+1/sec</div>
          <button 
            disabled={credits < 10 + (miners * 5)}
            onClick={() => { setCredits(c => c - (10 + (miners * 5))); setMiners(m => m + 1); }}
            className="w-full py-2 bg-indigo-600 disabled:bg-indigo-900 disabled:text-indigo-500 rounded-lg font-bold transition-colors"
          >
            Buy ({10 + (miners * 5)})
          </button>
        </div>
        <div className="bg-violet-950/50 border border-violet-500/20 p-4 rounded-2xl flex flex-col items-center">
          <div className="text-lg font-bold mb-1">Factories ({factories})</div>
          <div className="text-sm text-violet-400 mb-4">+5/sec</div>
          <button 
            disabled={credits < 100 + (factories * 50)}
            onClick={() => { setCredits(c => c - (100 + (factories * 50))); setFactories(f => f + 1); }}
            className="w-full py-2 bg-violet-600 disabled:bg-violet-900 disabled:text-violet-500 rounded-lg font-bold transition-colors"
          >
            Buy ({100 + (factories * 50)})
          </button>
        </div>
      </div>
    </div>
  );
}
