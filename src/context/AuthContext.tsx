import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AuthUser, MapId } from '../../shared/types.ts';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase.ts';

interface AuthContextValue {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  loginWithGoogle: () => Promise<AuthUser | null>;
  loginWithCredentials: (email: string, password: string) => Promise<AuthUser>;
  registerAccount: (params: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    photoUrl?: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  updateProfile: (updates: { displayName?: string; bio?: string; favoriteMap?: MapId; photoUrl?: string }) => Promise<void>;
  equipOrBuyCosmetic: (itemId: string) => Promise<void>;
  claimMission: (missionId: string) => Promise<void>;
  verifyEmail: (token?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function syncFirebaseProfileToFirestore(fbUser: FirebaseUser, appUser: AuthUser) {
  try {
    const userRef = doc(db, 'users', fbUser.uid);
    const existingPrivate = await getDoc(userRef);
    if (!existingPrivate.exists()) {
      await setDoc(userRef, {
        uid: fbUser.uid,
        username: appUser.username,
        email: fbUser.email || appUser.email,
        role: 'player',
        isBanned: false,
        emailVerified: fbUser.emailVerified,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, {
        emailVerified: fbUser.emailVerified,
        updatedAt: serverTimestamp(),
      });
    }

    const pubRef = doc(db, 'public_profiles', fbUser.uid);
    const existingPub = await getDoc(pubRef);
    if (!existingPub.exists()) {
      await setDoc(pubRef, {
        uid: fbUser.uid,
        username: appUser.username,
        displayName: appUser.displayName,
        photoUrl: appUser.photoUrl || '',
        bio: appUser.bio,
        favoriteMap: appUser.favoriteMap,
        level: appUser.level,
        xp: appUser.xp,
        coins: appUser.coins,
        wins: appUser.wins,
        losses: appUser.losses,
        matchesPlayed: appUser.matchesPlayed,
        playtimeSeconds: appUser.playtimeSeconds,
        online: true,
        equippedSkin: appUser.equippedSkin,
        equippedAccessory: appUser.equippedAccessory,
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(pubRef, {
        online: true,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${fbUser.uid}`);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!mounted) return;
      setFirebaseUser(fbUser);
      if (fbUser && fbUser.email) {
        try {
          const res = await fetch('/api/auth/firebase-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email.split('@')[0],
              photoUrl: fbUser.photoURL || '',
              emailVerified: fbUser.emailVerified,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (mounted) setUser(data.user);
            if (fbUser.emailVerified) {
              void syncFirebaseProfileToFirestore(fbUser, data.user).catch(() => {});
            }
          }
        } catch {
          // Ignore sync transient failure
        }
      } else {
        await refreshUser();
      }
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, [refreshUser]);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    const cred = await signInWithPopup(auth, googleAuthProvider);
    const fbUser = cred.user;
    const res = await fetch('/api/auth/firebase-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName || 'Player',
        photoUrl: fbUser.photoURL || '',
        emailVerified: fbUser.emailVerified,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google Sign-In sync failed');
    setUser(data.user);
    if (fbUser.emailVerified) {
      await syncFirebaseProfileToFirestore(fbUser, data.user).catch(() => {});
    }
    return data.user as AuthUser;
  }, []);

  const loginWithCredentials = useCallback(async (email: string, password: string) => {
    setError(null);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    setUser(data.user);
    return data.user as AuthUser;
  }, []);

  const registerAccount = useCallback(
    async (params: { username: string; email: string; password: string; confirmPassword: string; photoUrl?: string }) => {
      setError(null);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setUser(data.user);
      return data.user as AuthUser;
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    if (auth.currentUser) {
      await firebaseSignOut(auth).catch(() => {});
    }
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (updates: { displayName?: string; bio?: string; favoriteMap?: MapId; photoUrl?: string }) => {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      setUser(data.user);
      if (auth.currentUser?.emailVerified) {
        await updateDoc(doc(db, 'public_profiles', auth.currentUser.uid), {
          displayName: data.user.displayName,
          bio: data.user.bio,
          favoriteMap: data.user.favoriteMap,
          photoUrl: data.user.photoUrl,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    },
    []
  );

  const equipOrBuyCosmetic = useCallback(async (itemId: string) => {
    const res = await fetch('/api/cosmetics/equip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ itemId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Cosmetic action failed');
    setUser(data.user);
  }, []);

  const claimMission = useCallback(async (missionId: string) => {
    const res = await fetch('/api/missions/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ missionId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Claim failed');
    setUser(data.user);
  }, []);

  const verifyEmail = useCallback(async (token?: string) => {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verification failed');
    if (data.user) setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        error,
        refreshUser,
        loginWithGoogle,
        loginWithCredentials,
        registerAccount,
        logout,
        updateProfile,
        equipOrBuyCosmetic,
        claimMission,
        verifyEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
