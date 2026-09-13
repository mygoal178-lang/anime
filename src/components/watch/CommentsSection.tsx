import React, { useState, useEffect } from 'react';
import { MessageSquare, ThumbsUp, Send, User, Trash2, Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CommentRecord } from '../../types';
import { getSafeAvatar, DEFAULT_FALLBACK_AVATAR } from '../../lib/avatars';

interface CommentsSectionProps {
  animeMalId: number;
  currentEpNum: number;
  animeTitle: string;
}

export function CommentsSection({ animeMalId, currentEpNum, animeTitle }: CommentsSectionProps) {
  const { user, supabaseUser, isAdmin, showToast } = useAuth();
  const [tab, setTab] = useState<'episode' | 'anime'>('episode');
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load comments for current anime/episode
  useEffect(() => {
    let isMounted = true;
    async function loadComments() {
      setIsLoading(true);
      try {
        const epFilter = tab === 'episode' ? currentEpNum : null;

        // Try direct Supabase query
        let query = supabase
          .from('comments')
          .select('*')
          .eq('anime_mal_id', animeMalId)
          .order('created_at', { ascending: false });

        if (epFilter !== null) {
          query = query.eq('episode_number', epFilter);
        }

        const { data, error } = await query;
        if (!error && data && isMounted) {
          setComments(data as CommentRecord[]);
        } else {
          // Fallback to API
          const res = await api.getComments(animeMalId, epFilter);
          if (isMounted) {
            setComments(res || []);
          }
        }
      } catch {
        if (isMounted) setComments([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    if (animeMalId) {
      loadComments();
    }

    return () => {
      isMounted = false;
    };
  }, [animeMalId, currentEpNum, tab]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsSubmitting(true);
    try {
      const epNumber = tab === 'episode' ? currentEpNum : null;
      const userName = user?.name || 'AniVault Fan';
      const currentUserId = supabaseUser?.id || user?.id || null;
      const userAvatar = getSafeAvatar(user?.avatar, currentUserId || user?.email || userName);

      // 1. Try Supabase Insert with auth.uid()
      const { data, error } = await supabase
        .from('comments')
        .insert({
          anime_mal_id: Number(animeMalId),
          episode_number: epNumber,
          user_id: currentUserId,
          user_name: userName,
          user_avatar: userAvatar,
          comment: commentText.trim(),
          likes: 0,
          liked_by: [],
          created_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (!error && data) {
        setComments((prev) => [data as CommentRecord, ...prev]);
        setCommentText('');
        showToast('Comment posted successfully!');
      } else {
        // Fallback to server API
        const created = await api.postComment(
          animeMalId,
          commentText.trim(),
          epNumber,
          userName,
          userAvatar
        );
        setComments((prev) => [created, ...prev]);
        setCommentText('');
        showToast('Comment posted successfully!');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to post comment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (commentId: string) => {
    try {
      const targetComment = comments.find((c) => c.id === commentId);
      if (!targetComment) return;

      const currentUserId = supabaseUser?.id || user?.id || 'anon';
      const likedByArray: string[] = Array.isArray(targetComment.liked_by) ? targetComment.liked_by : [];
      const alreadyLiked = likedByArray.includes(currentUserId);

      const newLikedBy = alreadyLiked
        ? likedByArray.filter((uid) => uid !== currentUserId)
        : [...likedByArray, currentUserId];

      const newLikesCount = Math.max(0, alreadyLiked ? targetComment.likes - 1 : targetComment.likes + 1);

      // Optimistic update
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, likes: newLikesCount, liked_by: newLikedBy }
            : c
        )
      );

      // Persist to Supabase
      await supabase
        .from('comments')
        .update({
          likes: newLikesCount,
          liked_by: newLikedBy,
        })
        .eq('id', commentId);
    } catch {
      // Fallback via API
      await api.likeComment(commentId).catch(() => {});
    }
  };

  const handleDelete = async (commentId: string, commentUserId?: string) => {
    const isOwner = supabaseUser && commentUserId === supabaseUser.id;
    if (!isOwner && !isAdmin) {
      showToast('You can only delete your own comments.', 'error');
      return;
    }

    try {
      const { error } = await supabase.from('comments').delete().eq('id', commentId);
      if (!error) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        showToast('Comment removed.');
      } else {
        const res = await api.deleteComment(commentId);
        if (res.success) {
          setComments((prev) => prev.filter((c) => c.id !== commentId));
          showToast('Comment removed.');
        }
      }
    } catch {
      showToast('Failed to delete comment.');
    }
  };

  return (
    <section className="rounded-3xl border border-white/5 bg-[#0a0a10] p-4 sm:p-6 backdrop-blur-md">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-black italic uppercase tracking-tight text-white flex items-center gap-2 border-l-4 border-purple-600 pl-3">
            <MessageSquare className="h-5 w-5 text-purple-400" /> Community Discussion
          </h2>
          <p className="text-xs text-slate-400 font-medium pl-4 mt-0.5">
            Share your thoughts on {animeTitle}
          </p>
        </div>

        {/* Filter Tabs: Current Episode vs All Anime */}
        <div className="flex rounded-xl bg-[#08080c] p-1 border border-white/5">
          <button
            onClick={() => setTab('episode')}
            className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all ${
              tab === 'episode'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ep {currentEpNum} Only
          </button>
          <button
            onClick={() => setTab('anime')}
            className={`rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all ${
              tab === 'anime'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Episodes
          </button>
        </div>
      </div>

      {/* Comment Input Form */}
      <form onSubmit={handleSubmitComment} className="mb-8">
        <div className="flex gap-3">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-950/60 border border-purple-500/30 text-purple-400 overflow-hidden shadow-sm">
            {user ? (
              <img
                src={getSafeAvatar(user.avatar, user.id || user.email)}
                alt={user.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.endsWith(DEFAULT_FALLBACK_AVATAR)) {
                    target.src = DEFAULT_FALLBACK_AVATAR;
                  }
                }}
                className="h-full w-full rounded-2xl object-cover"
              />
            ) : (
              <User className="h-5 w-5" />
            )}
          </div>
          <div className="flex-1 space-y-2">
            <textarea
              required
              rows={2}
              placeholder={
                user
                  ? `Leave a comment as ${user.name}...`
                  : 'Join the conversation (Sign in to track comments)...'
              }
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#08080c] p-3 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition-all resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">
                {tab === 'episode' ? `Posting to Episode ${currentEpNum}` : `Posting to Anime Discussion`}
              </span>
              <button
                type="submit"
                disabled={isSubmitting || !commentText.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-purple-500 disabled:opacity-40 transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Posting...' : 'Post Comment'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 w-full rounded-2xl bg-[#08080c]" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#08080c] p-8 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <h4 className="text-xs font-bold text-slate-300 uppercase">No comments yet</h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Be the first to share your thoughts on this {tab === 'episode' ? 'episode' : 'anime'}!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => {
            const isAuthor = (supabaseUser && c.user_id === supabaseUser.id) || (user && c.user_id === user.id);
            const canDelete = isAuthor || isAdmin;

            return (
              <div
                key={c.id}
                className="group relative rounded-2xl border border-white/5 bg-[#08080c] p-3.5 sm:p-4 transition-all hover:border-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-purple-950/40 border border-purple-500/30 overflow-hidden shadow-sm">
                      <img
                        src={getSafeAvatar(c.user_avatar, c.user_id || c.user_name)}
                        alt={c.user_name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (!target.src.endsWith(DEFAULT_FALLBACK_AVATAR)) {
                            target.src = DEFAULT_FALLBACK_AVATAR;
                          }
                        }}
                        className="h-full w-full rounded-2xl object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{c.user_name}</span>
                        {c.episode_number !== null && c.episode_number !== undefined && (
                          <span className="rounded-md bg-purple-950/80 border border-purple-500/30 px-1.5 py-0.5 text-[9px] font-bold text-purple-300">
                            EP {c.episode_number}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(c.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions (Like & Delete) */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLike(c.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition-all"
                    >
                      <Heart className="h-3 w-3 fill-rose-500/20 text-rose-400" />
                      <span>{c.likes || 0}</span>
                    </button>

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(c.id, c.user_id)}
                        className="rounded-lg p-1 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                        title="Delete comment"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Comment Text */}
                <p className="mt-2 text-xs text-slate-300 leading-relaxed pl-10 whitespace-pre-wrap">
                  {c.comment}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
