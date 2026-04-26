import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Heart, Zap, Gamepad2, Loader2, ArrowLeft, UserPlus, UserCheck, Users, Clock, X, Check, User } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  getUserPublicGames, toggleFollow, checkIsFollowing, SavedGame, toggleLike, getUserLikedGameIds,
  getFriendStatus, sendFriendRequest, cancelFriendRequest, acceptFriendRequest, declineFriendRequest,
  removeFriend, getPendingFriendRequests, getFriends, FriendStatus, FriendRequest,
} from '../services/db';
import { bundleForPreview } from '../services/geminiService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

// ── Category Helper ───────────────────────────────────────────────────────────
function getCategoryForGame(game: SavedGame): string {
  const text = ((game.prompt || '') + ' ' + (game.title || '')).toLowerCase();
  if (text.includes('funny') || text.includes('joke') || text.includes('silly') || text.includes('meme') || text.includes('barbie') || text.includes('weird') || text.includes('cursed')) return 'Funny';
  if (text.includes('survival') || text.includes('survive') || text.includes('wave') || text.includes('horde')) return 'Survival';
  if (text.includes('puzzle') || text.includes('logic') || text.includes('match') || text.includes('memory') || text.includes('maze') || text.includes('sliding tile')) return 'Puzzle';
  if (text.includes('relaxing') || text.includes('relax') || text.includes('calm') || text.includes('peaceful') || text.includes('clicker') || text.includes('idle')) return 'Relaxing';
  if (text.includes('simulation') || text.includes('simulator') || text.includes('farm') || text.includes('city') || text.includes('tycoon') || text.includes('build')) return 'Simulation';
  if (text.includes('cute') || text.includes('pet') || text.includes('animal') || text.includes('kawaii') || text.includes('bunny') || text.includes('cat')) return 'Cute';
  if (text.includes('adventure') || text.includes('explore') || text.includes('dungeon') || text.includes('quest') || text.includes('rpg')) return 'Adventure';
  if (text.includes('arcade') || text.includes('shooter') || text.includes('shoot') || text.includes('flappy') || text.includes('runner') || text.includes('dodge') || text.includes('space')) return 'Arcade';
  if (text.includes('2d') || text.includes('platform') || text.includes('side scroll') || text.includes('jump') || text.includes('mario') || text.includes('side-scroll')) return '2D';
  if (text.includes('casual') || text.includes('simple') || text.includes('tap') || text.includes('click') || text.includes('easy')) return 'Casual';
  const hash = (game.id || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return['Casual', 'Arcade', '2D', 'Funny'][hash % 4];
}

// ── Perfect Scaling Game Preview ──────────────────────────────────────────────
function GamePreview({ files }: { files: Record<string, string> }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const[visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  },[]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resizeObs = new ResizeObserver(entries => {
      for (let entry of entries) {
        setScale(entry.contentRect.width / 1280);
      }
    });
    resizeObs.observe(el);
    return () => resizeObs.disconnect();
  },[]);

  useEffect(() => {
    if (!visible) return;
    const html = bundleForPreview(files);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    if (iframeRef.current) iframeRef.current.src = url;
    return () => URL.revokeObjectURL(url);
  },[visible, files]);

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-[#0A0A10] overflow-hidden">
      {visible ? (
        <iframe
          ref={iframeRef}
          sandbox="allow-scripts allow-same-origin"
          className="absolute top-0 left-0 border-none pointer-events-none origin-top-left"
          style={{ width: '1280px', height: '720px', transform: `scale(${scale})` }}
          title="game preview"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Gamepad2 className="w-8 h-8 text-zinc-800" />
        </div>
      )}
    </div>
  );
}

// ── Main Profile Component ────────────────────────────────────────────────────
export default function Contact({ user, userProfile, onLogout }: { user?: any, userProfile?: any, onLogout?: () => void }) {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  
  const [creator, setCreator] = useState<any>(null);
  const[games, setGames] = useState<SavedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  // Follower State
  const[isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const[followPending, setFollowPending] = useState(false);

  // Friend Request State
  const[friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const[friendPending, setFriendPending] = useState(false);
  const[pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const[showFriendRequests, setShowFriendRequests] = useState(false);
  const[friends, setFriends] = useState<{ uid: string; displayName: string; photoURL: string }[]>([]);

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

        const[publicGames, liked] = await Promise.all([
          getUserPublicGames(uid!),
          user ? getUserLikedGameIds(user.uid) : Promise.resolve(new Set<string>()),
        ]);
        setGames(publicGames);
        setLikedIds(liked);

        if (user && user.uid !== uid) {
          const[following, fStatus] = await Promise.all([
            checkIsFollowing(user.uid, uid!),
            getFriendStatus(user.uid, uid!),
          ]);
          setIsFollowing(following);
          setFriendStatus(fStatus);
        }

        const friendRecords = await getFriends(uid!);
        const friendUids = friendRecords.map(r => r.fromUserId === uid ? r.toUserId : r.fromUserId);
        if (friendUids.length > 0) {
          const friendProfiles = await Promise.all(
            friendUids.map(async fUid => {
              const snap = await getDoc(doc(db, 'users', fUid));
              if (!snap.exists()) return null;
              const d = snap.data();
              return { uid: fUid, displayName: d.displayName || 'Anonymous', photoURL: d.photoURL || '' };
            })
          );
          setFriends(friendProfiles.filter(Boolean) as { uid: string; displayName: string; photoURL: string }[]);
        }

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
  },[uid, user]);

  const handleLike = useCallback(async (e: React.MouseEvent, gameId: string) => {
    e.stopPropagation();
    if (!user) { alert('Sign in to like games!'); return; }
    const wasLiked = likedIds.has(gameId);
    setLikedIds(prev => { const n = new Set(prev); wasLiked ? n.delete(gameId) : n.add(gameId); return n; });
    setGames(prev => prev.map(g => g.id === gameId ? { ...g, likes: Math.max(0, (g.likes ?? 0) + (wasLiked ? -1 : 1)) } : g));
    await toggleLike(gameId, user.uid);
  }, [user, likedIds]);

  const handleFollowToggle = async () => {
    if (!user) { alert("Please sign in to follow creators!"); return; }
    if (followPending || user.uid === uid) return;
    
    setFollowPending(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setFollowerCount(prev => prev + (wasFollowing ? -1 : 1));
    
    try { await toggleFollow(user.uid, uid!); } 
    catch (error) {
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
        await sendFriendRequest(user.uid, uid!, user.displayName || user.email || 'Anonymous', user.photoURL || '');
        setFriendStatus('pending_sent');
      } else if (friendStatus === 'pending_sent') {
        await cancelFriendRequest(user.uid, uid!);
        setFriendStatus('none');
      } else if (friendStatus === 'pending_received') {
        await acceptFriendRequest(uid!, user.uid);
        setFriendStatus('friends');
      } else if (friendStatus === 'friends') {
        await removeFriend(user.uid, uid!);
        setFriendStatus('none');
      }
    } catch (err) { console.error('Friend action failed:', err); }
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
      <div className="min-h-screen bg-[#05050A] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#FF00C0] animate-spin" />
      </div>
    );
  }

  const displayName = creator?.displayName || 'Anonymous Creator';
  const isOwnProfile = !!user && user.uid === uid;
  const isOtherProfile = !!user && user.uid !== uid;

  return (
    <div className="min-h-screen bg-[#05050A] text-white font-sora flex flex-col selection:bg-[#FF00C0]/30">
      <SEO title={`${displayName}'s Profile - GameBot`} description={`Play public games created by ${displayName} on GameBot.`} />
      <Navbar user={user} userProfile={userProfile} onLogout={onLogout} />

      <main className="flex-grow pt-32 pb-20 px-6 max-w-[1200px] mx-auto w-full">
        
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
          
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden shrink-0 flex items-center justify-center shadow-[0_0_30px_rgba(255,0,192,0.15)] bg-gradient-to-tr from-[#00AFFF] to-[#FF00C0]">
            {creator?.photoURL ? (
              <img src={creator.photoURL} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl font-bold text-white drop-shadow-md">
                {displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mb-3">
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{displayName}</h1>
              
              {isOtherProfile && (
                <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
                  <button
                    onClick={handleFollowToggle}
                    disabled={followPending}
                    className={`px-5 py-2 rounded-full text-[13px] font-bold flex items-center justify-center gap-2 transition-all ${
                      isFollowing
                        ? 'bg-transparent text-white border border-[#FF00C0]/50 hover:bg-[#FF00C0]/10'
                        : 'bg-gradient-to-r from-[#FF00C0] to-[#00AFFF] text-black hover:opacity-90 shadow-[0_0_15px_rgba(255,0,192,0.3)]'
                    }`}
                  >
                    {isFollowing ? <><UserCheck className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
                  </button>

                  <button
                    onClick={handleFriendAction}
                    disabled={friendPending}
                    className={`px-5 py-2 rounded-full text-[13px] font-bold flex items-center justify-center gap-2 transition-all border disabled:opacity-60 ${
                      friendStatus === 'friends'
                        ? 'bg-[#00AFFF]/10 border-[#00AFFF]/30 text-[#00AFFF] hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                        : friendStatus === 'pending_sent'
                        ? 'bg-transparent border-white/20 text-[#B3B6CB]'
                        : friendStatus === 'pending_received'
                        ? 'bg-[#FF00C0]/20 border-[#FF00C0]/40 text-[#FF00C0]'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
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
                </div>
              )}
            </div>

            <div className="flex items-center justify-center md:justify-start gap-5 mb-4 text-[13px] font-medium text-[#B3B6CB]">
              <span className="flex items-center gap-2">
                <Gamepad2 className="w-[18px] h-[18px] text-[#FF00C0]" strokeWidth={2.5} />
                <strong className="text-white">{games.length}</strong> Games
              </span>
              <span className="flex items-center gap-2">
                <Users className="w-[18px] h-[18px] text-[#FF00C0]" strokeWidth={2.5} />
                <strong className="text-white">{followerCount}</strong> Followers
              </span>
              <span className="flex items-center gap-2">
                <User className="w-[18px] h-[18px] text-[#FF00C0]" strokeWidth={2.5} />
                <strong className="text-white">{creator?.followingCount || 0}</strong> Following
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              {creator?.discordUsername && (
                <button 
                  onClick={handleDiscordCopy}
                  title="Copy Discord Username"
                  className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/20 transition-all cursor-pointer"
                >
                  Discord • {creator.discordUsername}
                </button>
              )}

              {creator?.steamUsername && (
                <a 
                  href={`https://steamcommunity.com/id/${creator.steamUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider px-4 py-2 bg-[#00AFFF]/10 hover:bg-[#00AFFF]/20 text-[#00AFFF] rounded-full border border-[#00AFFF]/20 transition-all cursor-pointer"
                >
                  Steam • {creator.steamUsername}
                </a>
              )}
            </div>
          </div>
        </div>

        {isOwnProfile && pendingRequests.length > 0 && (
          <div className="mb-10 bg-[#0A0A10] border border-white/10 rounded-[24px] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF00C0]" /> Friend Requests
                <span className="px-2 py-0.5 rounded-full bg-[#FF00C0]/20 text-[#FF00C0] text-[11px] font-bold">
                  {pendingRequests.length}
                </span>
              </h3>
            </div>
            <ul className="divide-y divide-white/5">
              {pendingRequests.map(req => (
                <li key={req.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00AFFF] to-[#FF00C0] overflow-hidden shrink-0 flex items-center justify-center">
                    {req.fromPhotoURL ? (
                      <img src={req.fromPhotoURL} alt={req.fromDisplayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-white">{(req.fromDisplayName || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-white truncate">{req.fromDisplayName}</p>
                    <p className="text-[12px] text-[#B3B6CB]">wants to be your friend</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => handleAcceptRequest(req)} className="px-4 py-2 rounded-full text-[11px] font-bold bg-[#FF00C0]/20 text-[#FF00C0] hover:bg-[#FF00C0]/30 transition-all">
                      Accept
                    </button>
                    <button onClick={() => handleDeclineRequest(req)} className="px-4 py-2 rounded-full text-[11px] font-bold bg-white/5 text-[#B3B6CB] hover:bg-white/10 hover:text-white transition-all">
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {friends.length > 0 && (
          <div className="mb-14">
            <h2 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#FF00C0]" strokeWidth={2.5} />
              Friends ({friends.length})
            </h2>
            <div className="flex flex-wrap gap-3">
              {friends.map(friend => (
                <button
                  key={friend.uid}
                  onClick={() => navigate(`/profile/${friend.uid}`)}
                  className="flex items-center gap-2.5 bg-transparent border border-white/10 hover:border-white/20 hover:bg-white/[0.02] rounded-full pl-1.5 pr-4 py-1.5 transition-all"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#00AFFF] to-[#FF00C0] overflow-hidden shrink-0 flex items-center justify-center">
                    {friend.photoURL ? (
                      <img src={friend.photoURL} alt={friend.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[11px] font-bold text-white">
                        {friend.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-[13px] font-bold text-white">{friend.displayName}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Gamepad2 className="w-[22px] h-[22px] text-[#FF00C0]" strokeWidth={2.5} /> Games
        </h2>
        
        {games.length === 0 ? (
          <div className="text-center py-24 bg-[#0A0A10]/50 rounded-[24px] border border-white/5">
            <p className="text-lg font-bold text-[#B3B6CB]">No public games found for this creator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game, idx) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * Math.min(idx, 8) }}
                className="group relative bg-[#0A0A10] border border-white/5 rounded-[24px] overflow-hidden hover:border-white/10 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col"
                onClick={() => navigate(`/play/${game.id}`)}
              >
                <div className="relative overflow-hidden w-full aspect-[16/10] border-b border-white/5 bg-black">
                  <GamePreview files={game.files} />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                    <button className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#FF00C0] to-[#00AFFF] text-white flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,0,192,0.4)]">
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </button>
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-[15px] font-bold text-white mb-1.5 truncate">
                    "{game.title || 'Untitled Game'}"
                  </h3>
                  <p className="text-[12px] text-[#B3B6CB] line-clamp-1 mb-4">
                    {game.prompt}
                  </p>
                  
                  {/* Card Footer (Likes & Plays on Left, Genre on Right) */}
                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={e => handleLike(e, game.id!)}
                        className="flex items-center gap-1.5 text-[12px] font-bold text-[#B3B6CB] hover:text-[#FF00C0] transition-colors"
                      >
                        <Heart className={`w-4 h-4 ${likedIds.has(game.id!) ? 'fill-[#FF00C0] text-[#FF00C0]' : ''}`} />
                        {game.likes ?? 0}
                      </button>
                      <span className="flex items-center gap-1.5 text-[12px] font-bold text-[#B3B6CB]">
                        <Zap className="w-4 h-4 text-[#00AFFF] fill-[#00AFFF]/20" />
                        {game.playCount || 0} Plays
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      {getCategoryForGame(game)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}