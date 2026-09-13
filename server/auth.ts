import { Request, Response, NextFunction } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase, supabaseAdmin, createAuthenticatedSupabaseClient } from './supabase.js';
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: 'user' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
  token?: string;
  supabase: SupabaseClient;
}

// Authenticate user by verifying Supabase Auth Access Token (Bearer token in Authorization header)
export async function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // Default to anonymous client
  req.supabase = supabase;

  if (!token) {
    return next();
  }

  req.token = token;
  const userClient = createAuthenticatedSupabaseClient(token);
  req.supabase = userClient;

  try {
    const { data: { user: sbUser }, error } = await userClient.auth.getUser(token);
    if (sbUser && !error) {
      // Query verified profile from public.users table in Supabase
      const clientForProfile = supabaseAdmin || userClient;
      const { data: profileData } = await clientForProfile
        .from('users')
        .select('id, email, name, avatar, role, created_at, updated_at')
        .eq('id', sbUser.id)
        .maybeSingle();

      const role = (profileData?.role as 'user' | 'admin') || 'user';

      const profile: UserProfile = {
        id: sbUser.id,
        email: sbUser.email || '',
        name: profileData?.name || sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'User',
        avatar: profileData?.avatar || sbUser.user_metadata?.avatar || null,
        role,
        created_at: profileData?.created_at || sbUser.created_at,
        updated_at: profileData?.updated_at,
      };

      req.user = profile;

      // Keep the user's JWT on the database client so RLS always applies.
      // This avoids making the whole admin request depend on the service-role
      // environment variable. The service role is used only for the profile
      // lookup above when available.
      req.supabase = userClient;
    }
  } catch (err) {
    // Token verification failed; proceed with anonymous client
    req.supabase = supabase;
  }

  next();
}

// Require authenticated normal user
export function requireUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in with Supabase Auth.' });
  }
  next();
}

// Require authenticated ADMIN user (checked against verified database role)
export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Admin authentication required. Please log in.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  // The role check above is performed against the verified Supabase Auth user
  // and public.users profile. Once the caller is confirmed as an admin, use the
  // server-only service-role client for admin CRUD. This avoids admin writes
  // being blocked by normal user RLS policies while keeping the service key out
  // of the browser. If the service-role key is not configured, keep the JWT
  // client so the request still fails safely rather than bypassing auth.
  if (supabaseAdmin) {
    req.supabase = supabaseAdmin;
  }

  next();
}
