import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, WatchHistoryRecord } from '../types';
import { supabase, Session, User } from '../lib/supabase';
import { getRandomAvatar, getDeterministicAvatar, getSafeAvatar } from '../lib/avatars';

interface AuthContextType {
  user: UserProfile | null;
  supabaseUser: User | null;
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
  favorites: number[];
  watchHistory: WatchHistoryRecord[];
  toast: { message: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  login: (email: string, password: string) => Promise<UserProfile>;
  adminLogin: (email: string, password: string) => Promise<UserProfile>;
  register: (email: string, name: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  toggleFavorite: (malId: number) => Promise<boolean>;
  isFavorite: (malId: number) => boolean;
  saveProgress: (animeMalId: number, epNum: number, progress: number, duration: number) => Promise<void>;
  refreshMe: () => Promise<void>;
  updateProfile: (data: { name?: string; avatar?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to translate Supabase Auth error messages into friendly user-facing text
function getFriendlyAuthErrorMessage(error: any): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const msg = error.message || String(error);
  if (msg.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please check your credentials.';
  }
  if (msg.includes('User already registered') || msg.includes('already exists')) {
    return 'An account with this email address already exists. Please sign in.';
  }
  if (msg.includes('Password should be at least')) {
    return 'Password is too short. Please use at least 6 characters.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (msg.includes('rate limit') || msg.includes('Too many requests')) {
    return 'Too many login attempts. Please wait a few moments and try again.';
  }
  return msg;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [watchHistory, setWatchHistory] = useState<WatchHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Fetch the verified profile from public.users. Database errors are not
  // silently converted into a normal user profile because doing so can make
  // an admin account appear to have lost its admin role.
  const fetchUserProfile = async (authUserId: string, authUserEmail: string, authUserMeta?: any): Promise<UserProfile> => {
    const assignedAvatar = getSafeAvatar(authUserMeta?.avatar, authUserId || authUserEmail);

    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, avatar, role, created_at, updated_at')
        .eq('id', authUserId)
        .maybeSingle();

      if (error) {
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
          continue;
        }
        throw new Error(`Supabase profile lookup failed: ${error.message}`);
      }

      if (data) {
        let userAvatar = data.avatar;
        if (!userAvatar || typeof userAvatar !== 'string' || !userAvatar.trim()) {
          userAvatar = assignedAvatar;
          const { error: avatarError } = await supabase
            .from('users')
            .update({ avatar: userAvatar, updated_at: new Date().toISOString() })
            .eq('id', authUserId);
          if (avatarError) console.warn('Could not persist automatic avatar:', avatarError.message);
        }

        return {
          id: data.id,
          email: data.email || authUserEmail,
          name: data.name || authUserMeta?.name || authUserEmail.split('@')[0],
          avatar: userAvatar,
          role: (data.role as 'user' | 'admin') || 'user',
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }

      // The Auth trigger normally creates this row automatically. This fallback
      // makes the app resilient if the trigger was created after an account.
      const newProfile: UserProfile = {
        id: authUserId,
        email: authUserEmail,
        name: authUserMeta?.name || authUserEmail.split('@')[0],
        avatar: assignedAvatar,
        role: 'user',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('users').insert({
        id: authUserId,
        email: authUserEmail,
        name: newProfile.name,
        avatar: assignedAvatar,
        role: 'user',
      });

      if (insertError && insertError.code !== '23505') {
        throw new Error(`Supabase profile creation failed: ${insertError.message}`);
      }

      // Re-read so the returned profile always reflects the database, including
      // an admin role that may already exist for this Auth user.
      const { data: createdProfile, error: rereadError } = await supabase
        .from('users')
        .select('id, email, name, avatar, role, created_at, updated_at')
        .eq('id', authUserId)
        .maybeSingle();

      if (rereadError) throw new Error(`Supabase profile re-read failed: ${rereadError.message}`);
      if (createdProfile) {
        return {
          id: createdProfile.id,
          email: createdProfile.email || authUserEmail,
          name: createdProfile.name || newProfile.name,
          avatar: createdProfile.avatar || assignedAvatar,
          role: (createdProfile.role as 'user' | 'admin') || 'user',
          created_at: createdProfile.created_at,
          updated_at: createdProfile.updated_at,
        };
      }

      throw new Error('Supabase profile could not be created or loaded.');
    }

    throw new Error('Supabase profile lookup failed after multiple attempts.');
  };

  // Load user favorites from Supabase public.watchlist
  const loadUserFavorites = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('watchlist')
        .select('anime_mal_id')
        .eq('user_id', userId);

      if (!error && data) {
        setFavorites(data.map((row) => Number(row.anime_mal_id)));
      } else {
        setFavorites([]);
      }
    } catch {
      setFavorites([]);
    }
  };

  // Load user watch history from Supabase public.watch_history
  const loadUserHistory = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('watch_history')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        setWatchHistory(data);
      } else {
        setWatchHistory([]);
      }
    } catch {
      setWatchHistory([]);
    }
  };

  // Central session refresher
  const refreshMe = async () => {
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (error || !currentSession || !currentSession.user) {
        setUser(null);
        setSupabaseUser(null);
        setSession(null);
        setFavorites([]);
        setWatchHistory([]);
        return;
      }

      setSession(currentSession);
      setSupabaseUser(currentSession.user);

      const profile = await fetchUserProfile(
        currentSession.user.id,
        currentSession.user.email || '',
        currentSession.user.user_metadata
      );

      setUser(profile);
      await Promise.all([
        loadUserFavorites(currentSession.user.id),
        loadUserHistory(currentSession.user.id),
      ]);
    } catch (err) {
      console.error('Failed to restore Supabase auth session:', err);
      setUser(null);
      setSupabaseUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen to Supabase Auth State Changes
  useEffect(() => {
    refreshMe();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (newSession?.user) {
          setSession(newSession);
          setSupabaseUser(newSession.user);
          const profile = await fetchUserProfile(
            newSession.user.id,
            newSession.user.email || '',
            newSession.user.user_metadata
          );
          setUser(profile);
          loadUserFavorites(newSession.user.id);
          loadUserHistory(newSession.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSupabaseUser(null);
        setSession(null);
        setFavorites([]);
        setWatchHistory([]);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Supabase Auth Login
  const login = async (email: string, password: string): Promise<UserProfile> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      throw new Error(getFriendlyAuthErrorMessage(error));
    }

    setSession(data.session);
    setSupabaseUser(data.user);

    const profile = await fetchUserProfile(
      data.user.id,
      data.user.email || email.trim(),
      data.user.user_metadata
    );

    setUser(profile);
    showToast(`Welcome back, ${profile.name}!`);
    loadUserFavorites(data.user.id);
    loadUserHistory(data.user.id);
    return profile;
  };

  // Supabase Auth Admin Login (verifies profile.role === 'admin' directly from Supabase)
  const adminLogin = async (email: string, password: string): Promise<UserProfile> => {
    const profile = await login(email, password);
    if (profile.role !== 'admin') {
      throw new Error('Access denied. This account does not have administrator privileges in Supabase.');
    }
    showToast('Authenticated as Administrator', 'success');
    return profile;
  };

  // Supabase Auth Register
  const register = async (email: string, name: string, password: string): Promise<UserProfile> => {
    // Automatically select a random anime character avatar for every newly registered user
    const selectedAvatar = getRandomAvatar();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          name: name.trim(),
          avatar: selectedAvatar,
        },
      },
    });

    if (error) {
      throw new Error(getFriendlyAuthErrorMessage(error));
    }

    if (!data.user) {
      throw new Error('Failed to create account. Please try again.');
    }

    if (data.session) {
      setSession(data.session);
      setSupabaseUser(data.user);
      const profile = await fetchUserProfile(data.user.id, data.user.email || email.trim(), {
        name: name.trim(),
        avatar: selectedAvatar,
      });
      setUser(profile);
      showToast(`Account created! Welcome, ${profile.name}!`);
      return profile;
    } else {
      showToast('Registration successful! Please check your email to confirm your account.', 'info');
      const tempProfile: UserProfile = {
        id: data.user.id,
        email: email.trim(),
        name: name.trim(),
        avatar: selectedAvatar,
        role: 'user',
        created_at: new Date().toISOString(),
      };
      return tempProfile;
    }
  };

  // Supabase Auth Sign Out
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign out error:', err);
    }
    setUser(null);
    setSupabaseUser(null);
    setSession(null);
    setFavorites([]);
    setWatchHistory([]);
    showToast('Logged out successfully', 'info');
  };

  // Watchlist Toggle with Supabase
  const toggleFavorite = async (malId: number): Promise<boolean> => {
    if (!user || !supabaseUser) {
      showToast('Please log in to add anime to your Watchlist.', 'error');
      return false;
    }

    const numMalId = Number(malId);
    const exists = favorites.includes(numMalId);

    try {
      if (exists) {
        const { error } = await supabase
          .from('watchlist')
          .delete()
          .eq('user_id', supabaseUser.id)
          .eq('anime_mal_id', numMalId);

        if (error) throw error;

        setFavorites((prev) => prev.filter((id) => id !== numMalId));
        showToast('Removed from Watchlist', 'info');
        return false;
      } else {
        const { error } = await supabase.from('watchlist').insert({
          user_id: supabaseUser.id,
          anime_mal_id: numMalId,
        });

        if (error) throw error;

        setFavorites((prev) => [...prev, numMalId]);
        showToast('Added to Watchlist!', 'success');
        return true;
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update watchlist in Supabase.', 'error');
      return exists;
    }
  };

  const isFavorite = (malId: number) => {
    return favorites.includes(Number(malId));
  };

  // Watch History Progress saved to Supabase
  const saveProgress = async (animeMalId: number, epNum: number, progress: number, duration: number) => {
    if (!user || !supabaseUser) return;
    try {
      const completed = duration > 0 && progress / duration > 0.85;

      const { data, error } = await supabase
        .from('watch_history')
        .upsert(
          {
            user_id: supabaseUser.id,
            anime_mal_id: Number(animeMalId),
            episode_number: Number(epNum),
            progress_seconds: Math.floor(progress),
            duration_seconds: Math.floor(duration),
            completed,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,anime_mal_id,episode_number',
          }
        )
        .select()
        .maybeSingle();

      if (error) {
        console.error('Failed to save watch progress to Supabase:', error);
        return;
      }
      if (data) {
        setWatchHistory((prev) => {
          const filtered = prev.filter(
            (item) => !(item.anime_mal_id === animeMalId && item.episode_number === epNum)
          );
          return [data, ...filtered];
        });
      }
    } catch (err) {
      console.error('Failed to save watch progress to Supabase:', err);
    }
  };

  // Update Profile (name, avatar) in public.users
  const updateProfile = async (data: { name?: string; avatar?: string }) => {
    if (!user || !supabaseUser) throw new Error('You must be logged in to update your profile.');

    const updates: any = {
      updated_at: new Date().toISOString(),
    };
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.avatar !== undefined) updates.avatar = data.avatar.trim();

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', supabaseUser.id);

    if (error) {
      throw new Error(error.message || 'Failed to update profile.');
    }

    setUser((prev) => (prev ? { ...prev, ...updates } : null));
    showToast('Profile updated successfully!');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        isAdmin: user?.role === 'admin',
        isLoading,
        favorites,
        watchHistory,
        toast,
        showToast,
        login,
        adminLogin,
        register,
        logout,
        toggleFavorite,
        isFavorite,
        saveProgress,
        refreshMe,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
