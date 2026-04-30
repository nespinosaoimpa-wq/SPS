'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  role: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Get initial session
    const initAuth = async () => {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession();
      
      if (supabaseSession) {
        setSession(supabaseSession);
        setUser(supabaseSession.user);
        
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', supabaseSession.user.id)
          .single();
        setRole(profile?.role || (supabaseSession.user.user_metadata?.role as string) || null);
      } else {
        // 🛡️ TACTICAL FALLBACK: Check localStorage for Master PIN sessions
        const localUserJson = localStorage.getItem('704_user');
        if (localUserJson) {
          try {
            const localUser = JSON.parse(localUserJson);
            setUser(localUser);
            setRole(localUser.role || localUser.user_metadata?.role || null);
            console.log('[Tactical Auth] Session restored from physical storage.');
          } catch (e) {
            console.error('[Tactical Auth] Failed to restore session:', e);
          }
        }
      }
      
      setLoading(false);
    };

    initAuth();

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setRole(profile?.role || (session.user.user_metadata?.role as string) || null);
      } else {
        // Fallback for tactical sessions during state changes
        const localUserJson = localStorage.getItem('704_user');
        if (localUserJson) {
           const localUser = JSON.parse(localUserJson);
           setUser(localUser);
           setRole(localUser.role || localUser.user_metadata?.role || null);
        } else {
           setRole(null);
        }
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('704_user'); 
    // Clear tactical bypass cookie
    document.cookie = "704_bypass_active=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
