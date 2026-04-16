import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Play, Heart, Zap, Gamepad2, Loader2, ArrowLeft, UserPlus, UserCheck, Users, Clock, X, Check, UserMinus } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  getUserPublicGames, toggleFollow, checkIsFollowing, SavedGame, toggleLike, getUserLikedGameIds,
  getFriendStatus, sendFriendRequest, cancelFriendRequest, acceptFriendRequest, declineFriendRequest,
  removeFriend, getPendingFriendRequests, FriendStatus, FriendRequest,
} from '../services/db';
import { bundleForPreview } from '../services/geminiService';
import Navbar from '../components/Navbar';
import SEO from '../components/SEO';

// ── Perfect Scaling Game Preview ──────────────────────────────────────────────
function GamePreview({ files }: { files: Record<string, string> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0.25); // Default scale fallback

  // 1. Observe when it comes into view so we don't load 50 iframes at once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // 2. Observe the container's exact pixel width to mathematically scale the 1280x720 game
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resizeObs = new ResizeObserver(entries => {
      for (let entry of entries) {
        // Our games are generated assuming a 1280x720 screen.
        // We divide the card's real pixel width by 1280 to get the exact perfect scale.
        setScale(entry.contentRect.width / 1280);
      }
    });
    resizeObs.observe(el);
    return () => resizeObs.disconnect();
  }, []);

  // 3. Inject the bundled game code
  useEffect(() => {
    if (!visible) return;
    const html = bundleForPreview(files);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    if (iframeRef.current) iframeRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [visible, files]);

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-zinc-950 overflow-hidden">
      {visible ? (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          className="absolute top-0 left-0 border-none pointer-events-none origin-top-left"
          style={{ 
            width: '1280px', 
            height: '720px', 
            transform: `scale(${scale})` 
          }}
          title="game preview"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Gamepad2 className="w-8 h-8 text-zinc-700" />
        </div>
      )}
    </div>
  );
}

// ── Main Profile Component ────────────────────────────────────────────────────
export default function UserProfile({ user }: { user?: any }) {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  
  const [creator, setCreator] = useState<any>(null);
  const [games, setGames] = useState<SavedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Follower State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followPending, setFollowPending] = useState(false);

  // Friend Request State
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [friendPending, setFriendPending] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [showFriendRequests, setShowFriendRequests] = useState(false);

  useEffect(() => {
    if (!uid) return;

    async function fetchProfile() {
      try {
        const userSnap = await getDoc(doc(db, 'users', uid!));
        if (userSnap.exists()) {
          const data = userSnap.data();
          setCreator(data);
          setFollowerCount(data.followersCount || 0);
        }

        const [publicGames, liked] = await Promise.all([
          getUserPublicGames(uid!),
          user ? getUserLikedGameIds(user.uid) : Promise.resolve(new Set<string>()),
        ]);
        setGames(publicGames);
        setLikedIds(liked);

        if (user && user.uid !== uid) {
          const [following, fStatus] = await Promise.all([
            checkIsFollowing(user.uid, uid!),
            getFriendStatus(user.uid, uid!),
          ]);
          setIsFollowing(following);
          setFriendStatus(fStatus);
        }

        // Load pending friend requests for own profile
        if (user && user.uid === uid) {
          const requests = await getPendingFriendRequests(user.uid);
          setPendingRequests(requests);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [uid, user]);

  const handleLike = useCallback(async (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    if (!user) { alert('Sign in to like games!'); return; }
    const wasLiked = likedIds.has(gameId);
    setLikedIds(prev => { const n = new Set(prev); wasLiked ? n.delete(gameId) : n.add(gameId); return n; });
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, likes: Math.max(0, (g.likes ?? 0) + (wasLiked ? -1 : 1)) } : g));
    await toggleLike(gameId, user.uid);
  }, [user, likedIds]);

  const handleFollowToggle = async () => {
    if (!user) {
      alert("Please sign in to follow creators!");
      return;
    }
    if (followPending || user.uid === uid) return;
    
    setFollowPending(true);
    // Optimistic UI update
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount(prev => prev + (wasFollowing ? -1 : 1));
    
    try {
      await toggleFollow(user.uid, uid!);
    } catch (error) {
      // Revert on error
      setIsFollowing(wasFollowing);
      setFollowerCount(prev => prev + (wasFollowing ? 1 : -1));
      console.error("Failed to follow:", error);
    }
    setFollowPending(false);
  };

  const handleFriendAction = async () => {
    if (!user || user.uid === uid || friendPending) return;
    setFriendPending(true);
    try {
      if (friendStatus === 'none') {
        await sendFriendRequest(
          user.uid, uid!,
          user.displayName || user.email || 'Anonymous',
          user.photoURL || '',
        );
        setFriendStatus('pending_sent');
      } else if (friendStatus === 'pending_sent') {
        await cancelFriendRequest(user.uid, uid!);
        setFriendStatus('none');
      } else if (friendStatus === 'pending_received') {
        // Accept — the other user sent it, so fromUserId = uid, toUserId = user.uid
        await acceptFriendRequest(uid!, user.uid);
        setFriendStatus('friends');
      } else if (friendStatus === 'friends') {
        await removeFriend(user.uid, uid!);
        setFriendStatus('none');
      }
    } catch (err) {
      console.error('Friend action failed:', err);
    }
    setFriendPending(false);
  };

  const handleAcceptRequest = async (req: FriendRequest) => {
    await acceptFriendRequest(req.fromUserId, req.toUserId);
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
  };

  const handleDeclineRequest = async (req: FriendRequest) => {
    await declineFriendRequest(req.fromUserId, req.toUserId);
    setPendingRequests(prev => prev.filter(r => r.id !== req.id));
  };

  const handleDiscordCopy = () => {
    if (creator?.discordUsername) {
      navigator.clipboard.writeText(creator.discordUsername);
      alert("Discord username copied to clipboard!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const displayName = creator?.displayName || 'Anonymous Creator';
  const isOwnProfile = user?.uid === uid;

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      <SEO title={`${displayName}'s Profile - GameBot`} description={`Play public games created by ${displayName} on GameBot.`} />
      <Navbar user={user} />

      <main className="pt-32 pb-20 px-6 max-w-6xl mx-auto">
        <button onClick={() => navigate('/showcase')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-10 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Showcase
        </button>

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-16 relative">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/5 shrink-0 bg-zinc-900 flex items-center justify-center shadow-2xl">
            {creator?.photoURL ? (
              <img src={creator.photoURL} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl font-bold bg-gradient-to-tr from-emerald-400 to-cyan-500 bg-clip-text text-transparent">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-3">
              <h1 className="text-4xl font-display font-bold text-white">{displayName}</h1>
              
              {!isOwnProfile && (
                <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                  {/* Follow button */}
                  <button
                    onClick={handleFollowToggle}
                    disabled={followPending}
                    className={`px-5 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      isFollowing
                        ? 'bg-zinc-800 text-white hover:bg-red-500/20 hover:text-red-400 border border-zinc-700 hover:border-red-500/30'
                        : 'bg-white text-zinc-950 hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.15)]'
                    }`}
                  >
                    {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
                  </button>

                  {/* Add Friend button */}
                  {user && (
                    <button
                      onClick={handleFriendAction}
                      disabled={friendPending}
                      title={
                        friendStatus === 'none' ? 'Send friend request'
                        : friendStatus === 'pending_sent' ? 'Cancel friend request'
                        : friendStatus === 'pending_received' ? 'Accept friend request'
                        : 'Remove friend'
                      }
                      className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all border disabled:opacity-60 ${
                        friendStatus === 'friends'
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-red-500/15 hover:border-red-500/30 hover:text-red-400'
                          : friendStatus === 'pending_sent'
                          ? 'bg-amber-500/10 border-amber-500/25 text-amber-400 hover:bg-amber-500/20'
                          : friendStatus === 'pending_received'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {friendPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : friendStatus === 'friends' ? (
                        <><Users className="w-4 h-4" /> Friends</>
                      ) : friendStatus === 'pending_sent' ? (
                        <><Clock className="w-4 h-4" /> Requested</>
                      ) : friendStatus === 'pending_received' ? (
                        <><Check className="w-4 h-4" /> Accept</>
                      ) : (
                        <><UserPlus className="w-4 h-4" /> Add Friend</>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Own profile: friend requests badge */}
              {isOwnProfile && pendingRequests.length > 0 && (
                <button
                  onClick={() => setShowFriendRequests(v => !v)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all"
                >
                  <Users className="w-4 h-4" />
                  {pendingRequests.length} Friend Request{pendingRequests.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>

            <p className="text-zinc-400 text-base mb-5 flex items-center justify-center md:justify-start gap-4">
              <span><strong className="text-white">{games.length}</strong> Games</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
              <span><strong className="text-white">{followerCount}</strong> Followers</span>
              <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
              <span><strong className="text-white">{creator?.followingCount || 0}</strong> Following</span>
            </p>

            {/* Social Links Container */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {creator?.discordUsername && (
                <button 
                  onClick={handleDiscordCopy}
                  title="Copy Discord Username"
                  className="group relative flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/20 transition-all cursor-pointer overflow-hidden"
                >
                  <span>Discord</span>
                  <span className="max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap border-l border-indigo-500/30 pl-1.5 ml-0.5">
                    {creator.discordUsername}
                  </span>
                </button>
              )}

              {creator?.steamUsername && (
                <a 
                  href={`https://steamcommunity.com/id/${creator.steamUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View Steam Profile"
                  className="group relative flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/20 transition-all cursor-pointer overflow-hidden"
                >
                  <span>Steam</span>
                  <span className="max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap border-l border-sky-500/30 pl-1.5 ml-0.5">
                    {creator.steamUsername}
                  </span>
                </a>
              )}

              {creator?.githubUsername && (
                <a 
                  href={`https://github.com/${creator.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View GitHub Profile"
                  className="group relative flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-zinc-500/10 hover:bg-zinc-500/20 text-zinc-300 rounded-lg border border-zinc-500/20 transition-all cursor-pointer overflow-hidden"
                >
                  <span>GitHub</span>
                  <span className="max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 transition-all duration-300 ease-in-out whitespace-nowrap border-l border-zinc-500/30 pl-1.5 ml-0.5">
                    {creator.githubUsername}
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Friend Requests Inbox — own profile only */}
        {isOwnProfile && showFriendRequests && pendingRequests.length > 0 && (
          <div className="mb-10 bg-zinc-900/60 border border-white/8 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Friend Requests
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                  {pendingRequests.length}
                </span>
              </h3>
              <button
                onClick={() => setShowFriendRequests(false)}
                className="p-1 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <ul className="divide-y divide-white/5">
              {pendingRequests.map(req => (
                <li key={req.id} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {req.fromPhotoURL ? (
                      <img src={req.fromPhotoURL} alt={req.fromDisplayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg font-bold text-zinc-400">
                        {(req.fromDisplayName || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{req.fromDisplayName}</p>
                    <p className="text-xs text-zinc-500">wants to be your friend</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Games Grid */}
        <h2 className="text-2xl font-display font-bold mb-6 flex items-center gap-2">
          <Gamepad2 className="w-6 h-6 text-emerald-400" /> Cartridges
        </h2>
        
        {games.length === 0 ? (
          <div className="text-center py-24 glass-panel rounded-3xl border border-white/5">
            <p className="text-xl font-display text-zinc-500">No public games found for this creator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game, idx) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * Math.min(idx, 8) }}
                className="group relative bg-zinc-900/50 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col shadow-lg"
                onClick={() => navigate(`/play/${game.id}`)}
              >
                <div className="relative overflow-hidden w-full aspect-video border-b border-white/5">
                  <GamePreview files={game.files} />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10 backdrop-blur-sm">
                    <button className="w-14 h-14 rounded-full bg-white text-zinc-950 flex items-center justify-center hover:scale-110 transition-transform shadow-2xl">
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </button>
                  </div>
                </div>

                <div className="p-5 flex flex-col gap-3 flex-1 bg-zinc-900/80">
                  <h3 className="text-sm text-zinc-300 line-clamp-2 leading-relaxed font-medium">
                    "{game.title || game.prompt}"
                  </h3>
                  <div className="flex items-center justify-end mt-auto pt-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={e => handleLike(e, game.id!)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium transition-all ${
                          likedIds.has(game.id!)
                            ? 'bg-rose-500/20 border-rose-500/30 text-rose-400'
                            : 'bg-white/5 border-white/10 text-zinc-500 hover:text-rose-400 hover:border-rose-500/20 hover:bg-rose-500/10'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${likedIds.has(game.id!) ? 'fill-current' : ''}`} />
                        {game.likes ?? 0}
                      </button>
                      <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500" title="Plays">
                        <Zap className="w-3.5 h-3.5 text-yellow-500/80" /> {game.playCount ?? 0} plays
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}