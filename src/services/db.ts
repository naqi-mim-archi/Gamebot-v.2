import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, increment, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  tier: 'playground' | '14-day-trial' | 'creator' | 'pro' | 'studio';
  credits: number;
  trialEndDate: number | null;
  stripeCustomerId?: string;
  githubToken?: string;
  // Profile
  displayName?: string;
  photoURL?: string;
  // Connected platforms
  discordId?: string;
  discordUsername?: string;
  discordAvatar?: string;
  discordWebhookUrl?: string;
  steamId?: string;
  steamUsername?: string;
  steamAvatar?: string;
  // One-time connection rewards (20 tokens each)
  githubRewardClaimed?: boolean;
  discordRewardClaimed?: boolean;
  steamRewardClaimed?: boolean;
  //Followers
  followersCount?: number;
  followingCount?: number;
}

export interface SavedGame {
  id?: string;
  userId: string;
  prompt: string;
  files: Record<string, string>;
  createdAt: any;
  title?: string;
  likes?: number;
  isPublic?: boolean;
  playCount?: number;
}

export async function getOrCreateUserProfile(user: any): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return userSnap.data() as UserProfile;
  } else {
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    const newUserProfile: UserProfile = {
      uid: user.uid,
      email: user.email,
      tier: '14-day-trial',
      credits: 50,
      trialEndDate: trialEndDate.getTime(),
    };

    await setDoc(userRef, newUserProfile);
    return newUserProfile;
  }
}

export async function saveUserGame(userId: string, prompt: string, files: Record<string, string>, title?: string) {
  const gamesRef = collection(db, 'games');
  const docRef = await addDoc(gamesRef, {
    userId,
    prompt,
    files,
    title: title || prompt.slice(0, 50),
    likes: 0,
    playCount: 0,
    isPublic: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateGameTitle(gameId: string, title: string) {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, { title: title.trim() });
}

export async function updateUserProfile(uid: string, updates: Partial<Pick<UserProfile, 'displayName' | 'photoURL' | 'discordId' | 'discordUsername' | 'discordAvatar' | 'steamId' | 'steamUsername' | 'steamAvatar'>>) {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, updates as any);
}

export async function deductUserCredits(userId: string, amount: number) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    credits: increment(-amount)
  });
}

export async function getUserGames(userId: string): Promise<SavedGame[]> {
  try {
    const gamesRef = collection(db, 'games');
    const q = query(gamesRef, where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    const games = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedGame));
    // Sort client-side to avoid needing a composite index immediately
    return games.sort((a, b) => {
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error("Error fetching games:", error);
    return [];
  }
}

export async function toggleGamePublic(gameId: string, isPublic: boolean) {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, { isPublic });
}

export async function toggleLike(gameId: string, userId: string): Promise<boolean> {
  const likeId = `${gameId}_${userId}`;
  const likeRef = doc(db, 'gameLikes', likeId);
  const likeSnap = await getDoc(likeRef);
  const gameRef = doc(db, 'games', gameId);

  if (likeSnap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(gameRef, { likes: increment(-1) });
    return false; // unliked
  } else {
    await setDoc(likeRef, { gameId, userId, createdAt: serverTimestamp() });
    await updateDoc(gameRef, { likes: increment(1) });
    return true; // liked
  }
}

export async function getUserLikedGameIds(userId: string): Promise<Set<string>> {
  try {
    const likesRef = collection(db, 'gameLikes');
    const q = query(likesRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    return new Set(snap.docs.map(d => d.data().gameId as string));
  } catch (error) {
    console.error('Error fetching liked games:', error);
    return new Set(); // Return empty set on failure
  }
}

export async function getPublicGames(limitCount = 50): Promise<SavedGame[]> {
  try {
    const gamesRef = collection(db, 'games');
    // We remove the orderBy from the query to bypass the Firestore Index requirement
    const q = query(gamesRef, where('isPublic', '==', true), limit(limitCount));
    
    const snap = await getDocs(q);
    const games = snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedGame));

    // Sort them in Javascript instead
    return games.sort((a, b) => {
      if ((b.likes || 0) !== (a.likes || 0)) return (b.likes || 0) - (a.likes || 0);
      if ((b.playCount || 0) !== (a.playCount || 0)) return (b.playCount || 0) - (a.playCount || 0);
      
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
  } catch (error) {
    console.error('Error fetching public games:', error);
    return [];
  }
}

export async function incrementPlayCount(gameId: string) {
  const gameRef = doc(db, 'games', gameId);
  await updateDoc(gameRef, { playCount: increment(1) });
}

export async function getGameById(gameId: string): Promise<SavedGame | null> {
  const gameRef = doc(db, 'games', gameId);
  const snap = await getDoc(gameRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as SavedGame;
}

export async function getUserPublicGames(userId: string): Promise<SavedGame[]> {
  try {
    const gamesRef = collection(db, 'games');
    const q = query(gamesRef, where('userId', '==', userId), where('isPublic', '==', true));
    const snap = await getDocs(q);
    const games = snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedGame));
    return games.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
  } catch (error) {
    console.error('Error fetching user public games:', error);
    return [];
  }
}

export async function toggleFollow(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false; // Can't follow yourself
  
  const followRef = doc(db, 'userFollows', `${followerId}_${followingId}`);
  const followSnap = await getDoc(followRef);
  
  const followerProfileRef = doc(db, 'users', followerId);
  const followingProfileRef = doc(db, 'users', followingId);

  if (followSnap.exists()) {
    // Unfollow
    await deleteDoc(followRef);
    await updateDoc(followerProfileRef, { followingCount: increment(-1) });
    await updateDoc(followingProfileRef, { followersCount: increment(-1) });
    return false;
  } else {
    // Follow
    await setDoc(followRef, { followerId, followingId, createdAt: serverTimestamp() });
    await updateDoc(followerProfileRef, { followingCount: increment(1) });
    await updateDoc(followingProfileRef, { followersCount: increment(1) });
    return true;
  }
}

export async function checkIsFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (!followerId || !followingId) return false;
  const followRef = doc(db, 'userFollows', `${followerId}_${followingId}`);
  const snap = await getDoc(followRef);
  return snap.exists();
}