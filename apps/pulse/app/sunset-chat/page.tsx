'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, MessageSquare, Pin, Send, ShoppingBasket, Sparkles, Trash2 } from 'lucide-react';
import { SUNSET_CHAT_TAGS, SUNSET_CHAT_MAX_MESSAGE_LENGTH } from '@/lib/grill/sunsetChat';

type SunsetChatPost = {
  _id: string;
  nickname: string;
  message: string;
  tag: string;
  isPinned?: boolean;
  source?: string;
  couponCode?: string;
  createdAt: string;
  expiresAt: string;
};

export default function SunsetChatPage() {
  const [posts, setPosts] = useState<SunsetChatPost[]>([]);
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [tag, setTag] = useState('Local');
  const [canModerate, setCanModerate] = useState(false);
  const [moderatorName, setModeratorName] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [status, setStatus] = useState('');

  const deviceId = useMemo(() => {
    if (typeof window === 'undefined') return '';
    let stored = window.localStorage.getItem('sunset-chat-device-id');
    if (!stored) {
      stored = `chat-${crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
      window.localStorage.setItem('sunset-chat-device-id', stored);
    }
    return stored;
  }, []);

  useEffect(() => {
    const savedNickname = window.localStorage.getItem('sunset-chat-nickname') || '';
    setNickname(savedNickname);
    fetchPosts();
    fetchModerationStatus();
    const interval = window.setInterval(fetchPosts, 10000);
    return () => window.clearInterval(interval);
  }, []);

  const remaining = SUNSET_CHAT_MAX_MESSAGE_LENGTH - message.length;
  const helperCommand = message.trim()
    ? `Help me rewrite this Sunset Chat note so it is clear and friendly: ${message.trim()}`
    : 'Help me write a clear Sunset Chat note for the grill today';

  async function fetchPosts() {
    const response = await fetch('/api/sunset-chat', { cache: 'no-store' });
    if (!response.ok) return;
    const body = await response.json();
    setPosts(body?.data?.posts || []);
  }

  async function fetchModerationStatus() {
    const response = await fetch('/api/sunset-chat/moderation', { cache: 'no-store' });
    if (!response.ok) return;
    const body = await response.json();
    setCanModerate(Boolean(body?.data?.canModerate));
    setModeratorName(body?.data?.moderator?.name || body?.data?.moderator?.email || '');
  }

  async function submitPost() {
    setStatus('');
    setIsPosting(true);
    try {
      const response = await fetch('/api/sunset-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sunset-chat-device-id': deviceId,
        },
        body: JSON.stringify({ nickname, message, tag }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus(body?.message || 'Could not post right now.');
        return;
      }

      window.localStorage.setItem('sunset-chat-nickname', nickname.trim());
      setMessage('');
      setStatus('Posted.');
      await fetchPosts();
    } finally {
      setIsPosting(false);
    }
  }

  async function staffUpdate(postId: string, action: 'pin' | 'unpin' | 'delete') {
    if (!canModerate) {
      setStatus('Staff email approval required.');
      return;
    }

    const response = await fetch(`/api/sunset-chat/${postId}`, {
      method: action === 'delete' ? 'DELETE' : 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: action === 'delete' ? undefined : JSON.stringify({ isPinned: action === 'pin' }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setStatus(body?.message || 'Staff action failed.');
      return;
    }

    setStatus(action === 'delete' ? 'Post deleted.' : 'Pin updated.');
    await fetchPosts();
  }

  return (
    <main className="min-h-screen bg-[#080b10] text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.22),transparent_36%),linear-gradient(135deg,#111827,#030712)] px-5 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-amber-100">
              <MessageSquare size={14} />
              Sunset Chat
            </div>
            <h1 className="max-w-2xl text-5xl font-black tracking-tight md:text-6xl">What is happening at Sunset?</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
              Local notes, grill updates, quick deals, lost-and-found, and the small bits of counter life worth posting.
            </p>
          </div>
          <Link
            href="/grill"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-950 hover:bg-amber-300"
          >
            <ShoppingBasket size={17} />
            Order Food
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-5 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
              No posts yet today.
            </div>
          ) : (
            posts.map((post) => (
              <article
                key={post._id}
                className={`rounded-2xl border p-5 shadow-xl ${
                  post.isPinned
                    ? 'border-amber-300/35 bg-amber-300/10 shadow-amber-950/20'
                    : 'border-white/10 bg-white/[0.045] shadow-black/20'
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {post.isPinned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950">
                        <Pin size={11} />
                        Pinned
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
                      {post.tag}
                    </span>
                    <span className="text-sm font-black text-white">{post.nickname}</span>
                  </div>
                  <time className="text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500">
                    {new Date(post.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </time>
                </div>
                <p className="whitespace-pre-wrap text-lg leading-7 text-slate-100">{post.message}</p>
                {post.couponCode && (
                  <Link
                    href={`/grill?coupon=${encodeURIComponent(post.couponCode)}`}
                    className="mt-4 inline-flex rounded-lg bg-amber-300 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-950 hover:bg-amber-200"
                  >
                    Use {post.couponCode}
                  </Link>
                )}
                {canModerate && post.source !== 'official-deal' && (
                  <div className="mt-4 flex gap-2 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={() => staffUpdate(post._id, post.isPinned ? 'unpin' : 'pin')}
                      className="rounded-lg border border-amber-300/20 px-3 py-2 text-xs font-black uppercase tracking-widest text-amber-100 hover:bg-amber-300/10"
                    >
                      {post.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => staffUpdate(post._id, 'delete')}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-300/20 px-3 py-2 text-xs font-black uppercase tracking-widest text-rose-100 hover:bg-rose-500/10"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-5 shadow-2xl shadow-cyan-950/10">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-100">
              <Bot size={15} />
              Need help wording it?
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Send the note to the helper desk and it will use the same saved files Jamie uses.
            </p>
            <Link
              href={`/command-center?command=${encodeURIComponent(helperCommand)}`}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-200 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-cyan-100"
            >
              <Sparkles size={15} />
              Ask a Helper
            </Link>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-2xl shadow-black/25">
            <h2 className="text-lg font-black uppercase tracking-[0.16em] text-white">Post A Note</h2>
            <div className="mt-5 space-y-3">
              <input
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={32}
                placeholder="Nickname"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40"
              />
              <select
                value={tag}
                onChange={(event) => setTag(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white outline-none focus:border-amber-300/40"
              >
                {SUNSET_CHAT_TAGS.map((chatTag) => (
                  <option key={chatTag} className="bg-slate-950" value={chatTag}>{chatTag}</option>
                ))}
              </select>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value.slice(0, SUNSET_CHAT_MAX_MESSAGE_LENGTH))}
                maxLength={SUNSET_CHAT_MAX_MESSAGE_LENGTH}
                placeholder="Drop a short note..."
                rows={5}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold leading-6 text-white outline-none placeholder:text-slate-600 focus:border-amber-300/40"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{remaining} characters left</span>
                <span>Expires in 48h</span>
              </div>
              <button
                type="button"
                disabled={isPosting}
                onClick={submitPost}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-950 transition hover:bg-amber-100 disabled:opacity-40"
              >
                <Send size={16} />
                {isPosting ? 'Posting...' : 'Post'}
              </button>
              {status && <p className="text-sm font-bold text-amber-100">{status}</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
            <h3 className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Staff Controls</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {canModerate
                ? `Moderator mode is on${moderatorName ? ` for ${moderatorName}` : ''}.`
                : 'Sign in with an approved staff email to pin or remove posts.'}
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}
