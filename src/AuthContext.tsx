import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { UserProfile } from './types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Safety timeout to prevent infinite loading if Supabase hangs
    const authTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('Auth initialization timed out');
        setLoading(false);
      }
    }, 8000);

    // Check active sessions and sets the user
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;

        if (error) {
          console.error('Session error:', error);
          await supabase.auth.signOut();
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchProfile(currentUser.id, currentUser.email || '');
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth init failed:', err);
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      const currentUser = session?.user ?? null;
      
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
        setUser(currentUser);
        if (currentUser) {
          await fetchProfile(currentUser.id, currentUser.email || '');
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, email: string) => {
    try {
      // First try by user_id
      let { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // If not found, try by email to recover old data with incorrect user_id
      if (!data && !error) {
        const { data: byEmail, error: emailErr } = await supabase
          .from('employees')
          .select('*')
          .eq('email', email)
          .maybeSingle();
        
        if (byEmail) {
          console.log('Recovering old profile by email:', email);
          // Found by email, update user_id to claim it and fix consistency
          const { data: updated, error: updateErr } = await supabase
            .from('employees')
            .update({ user_id: userId })
            .eq('id', byEmail.id)
            .select()
            .single();
          
          if (!updateErr) {
            data = updated;
          } else {
            console.error('Failed to claim profile by email:', updateErr);
          }
        }
      }

      if (data) {
        // Map employee data to UserProfile
        setProfile({
          id: data.user_id,
          email: data.email || email,
          role: 'employee',
        });
      } else {
        // If no employee profile exists yet, set a default profile
        setProfile({
          id: userId,
          email: email,
          role: 'employee',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = profile?.role === 'admin' || user?.email === 'dtm@thesachdevgroup.com';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
