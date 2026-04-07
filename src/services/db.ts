import { doc, getDoc, setDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

export interface UserProfile {
  uid: string;
  email: string | null;
  tier: 'playground' | '14-day-trial' | 'creator' | 'pro' | 'studio';
  credits: number;
  trialEndDate: number | null;
  stripeCustomerId?: string;
  githubToken?: string;
}

export interface SavedGame {
  id?: string;
  userId: string;
  prompt: string;
  files: Record<string, string>;
  createdAt: any;
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

export async function saveUserGame(userId: string, prompt: string, files: Record<string, string>) {
  const gamesRef = collection(db, 'games');
  const docRef = await addDoc(gamesRef, {
    userId,
    prompt,
    files,
    createdAt: serverTimestamp()
  });
  return docRef.id;
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
