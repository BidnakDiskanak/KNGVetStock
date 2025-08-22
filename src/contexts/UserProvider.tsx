"use client";

import type { User } from '@/lib/types';
import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from 'next/navigation';

interface UserContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  reloadUser: (uid: string) => Promise<void>; // <-- Tipe data untuk fungsi baru
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setCurrentUser({ id: userDoc.id, ...userDoc.data() } as User);
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);


  const login = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userDocRef = doc(db, "users", userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      setCurrentUser({ id: userDoc.id, ...userDoc.data() } as User);
    } else {
      throw new Error("User data not found in Firestore.");
    }
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    router.push('/login');
  };
  
  // --- FUNGSI BARU UNTUK MEMUAT ULANG DATA PENGGUNA ---
  const reloadUser = useCallback(async (uid: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setCurrentUser({ id: userDoc.id, ...userDoc.data() } as User);
      }
    } catch (error) {
      console.error("Gagal memuat ulang data pengguna:", error);
    }
  }, []);
  // --- AKHIR FUNGSI BARU ---

  const contextValue = useMemo(() => ({
    user: currentUser,
    login,
    logout,
    isAuthenticated: !loading && !!currentUser,
    loading,
    reloadUser, // <-- Menyediakan fungsi baru melalui context
  }), [currentUser, loading, reloadUser]);

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
