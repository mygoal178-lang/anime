import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Tv,
  Film,
  BarChart2,
  RefreshCw,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { api } from '../../services/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: Array<{
    type: 'open_episodes' | 'open_anikoto' | 'open_stats' | 'open_cms';
    label: string;
    mal_id?: number;
    anime_title?: string;
  }>;
  issues?: Array<{
    mal_id: number;
    title: string;
    present_count: number;
    max_episode: number;
    missing_numbers: number[];
    missing_count: number;
    zero_server_episodes?: number[];
    issue: string;
    cover_url?: string | null;
  }>;
}

interface AdminAIAssistantProps {
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onOpenEpisodes?: (malId: number, title?: string) => void;
  onOpenTab?: (tab: 'stats' | 'manage-anime' | 'episodes') => void;
  onOpenAnikoto?: () => void;
}

export function AdminAIAssistant({
  showToast,
  onOpenEpisodes,
  onOpenTab,
  onOpenAnikoto,
}: AdminAIAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        'Hi! I am your **AniVault Admin Assistant**.\n\nI can tell you **where episodes are missing** (gaps, empty series, episodes without servers) and give a quick **site overview**.\n\nTry a quick action below or type a question.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<{
    total_anime_scanned: number;
    anime_with_issues: number;
    no_episodes: number;
    with_gaps: number;
    with_no_servers: number;
    total_missing_slots: number;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleAction = (action: NonNullable<ChatMessage['actions']>[number]) => {
    if (action.type === 'open_episodes' && action.mal_id != null) {
      onOpenEpisodes?.(action.mal_id, action.anime_title);
    } else if (action.type === 'open_anikoto') {
      onOpenAnikoto?.();
      onOpenTab?.('episodes');
    } else if (action.type === 'open_stats') {
      onOpenTab?.('stats');
    } else if (action.type === 'open_cms') {
      onOpenTab?.('manage-anime');
    }
  };

  const sendMessage = async (raw: string) => {
    const text = raw.trim();
    if (!text || isSending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const res = await api.askAdminAI(text);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: res.reply || 'No response.',
        actions: res.actions,
        issues: res.data?.issues,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: `Sorry — ${err.message || 'Failed to reach the assistant.'}`,
        },
      ]);
      showToast(err.message || 'AI assistant error', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const runFullScan = async () => {
    setIsScanning(true);
    try {
      const res = await api.getMissingEpisodes(80);
      setScanSummary(res.summary);
      const lines =
        res.issues.length === 0
          ? ['No issues found — catalog looks sequential.']
          : res.issues.slice(0, 12).map((r) => {
              if (r.issue === 'no_episodes') {
                return `• **${r.title}** (MAL ${r.mal_id}) — 0 episodes`;
              }
              if (r.issue === 'no_servers') {
                return `• **${r.title}** — episodes without servers: ${r.zero_server_episodes.slice(0, 6).join(', ')}`;
              }
              const sample = r.missing_numbers.slice(0, 8).join(', ');
              return `• **${r.title}** — missing ${r.missing_count}: ${sample}${r.missing_count > 8 ? '…' : ''}`;
            });

      setMessages((prev) => [
        ...prev,
        {
          id: `scan-${Date.now()}`,
          role: 'assistant',
          text:
            `**Full catalog scan**\n\n` +
            `Scanned **${res.summary.total_anime_scanned}** anime → **${res.summary.anime_with_issues}** with issues\n` +
            `• Empty series: **${res.summary.no_episodes}**\n` +
            `• Series with gaps: **${res.summary.with_gaps}**\n` +
            `• Episodes missing servers: **${res.summary.with_no_servers}**\n` +
            `• Total missing episode slots: **${res.summary.total_missing_slots}**\n\n` +
            lines.join('\n'),
          issues: res.issues as any,
          actions:
            res.issues[0]
              ? [
                  {
                    type: 'open_episodes' as const,
                    label: `Manage: ${res.issues[0].title}`,
                    mal_id: res.issues[0].mal_id,
                    anime_title: res.issues[0].title,
                  },
                  { type: 'open_anikoto' as const, label: 'Import from Anikoto' },
                ]
              : [{ type: 'open_cms' as const, label: 'Open Anime CMS' }],
        },
      ]);
    } catch (err: any) {
      showToast(err.message || 'Scan failed', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const renderMarkdownLite = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="text-white font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return (
        <span key={i} className="whitespace-pre-wrap">
          {part}
        </span>
      );
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/10 bg-[#0a0a14] p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Issues</p>
          <p className="text-2xl font-black text-white mt-1">
            {scanSummary ? scanSummary.anime_with_issues : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0a0a14] p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Empty series</p>
          <p className="text-2xl font-black text-rose-400 mt-1">
            {scanSummary ? scanSummary.no_episodes : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0a0a14] p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">With gaps</p>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {scanSummary ? scanSummary.with_gaps : '—'}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0a0a14] p-4">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Missing slots</p>
          <p className="text-2xl font-black text-cyan-400 mt-1">
            {scanSummary ? scanSummary.total_missing_slots : '—'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={runFullScan}
          disabled={isScanning}
          className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition disabled:opacity-50"
        >
          {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
          Scan missing episodes
        </button>
        <button
          type="button"
          onClick={() => sendMessage('Site stats')}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
        >
          <BarChart2 className="h-3.5 w-3.5" /> Site overview
        </button>
        <button
          type="button"
          onClick={() => sendMessage('Help')}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 transition"
        >
          <Sparkles className="h-3.5 w-3.5" /> What can you do?
        </button>
        <button
          type="button"
          onClick={() => onOpenTab?.('episodes')}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
        >
          <Tv className="h-3.5 w-3.5" /> Episode Manager
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#0a0a14] overflow-hidden shadow-xl flex flex-col" style={{ minHeight: 420 }}>
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3 bg-gradient-to-r from-rose-950/40 to-transparent">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-400">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Admin AI Assistant</h3>
            <p className="text-[11px] text-slate-400">Missing episodes · catalog health · management tips</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-h-[480px]">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-rose-600 text-white rounded-br-md'
                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-md'
                }`}
              >
                <div className="text-[13px]">{renderMarkdownLite(m.text)}</div>

                {m.issues && m.issues.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {m.issues.slice(0, 6).map((issue) => (
                      <button
                        key={issue.mal_id}
                        type="button"
                        onClick={() => onOpenEpisodes?.(issue.mal_id, issue.title)}
                        className="w-full text-left rounded-xl border border-white/10 bg-black/30 px-3 py-2 hover:border-rose-500/40 transition group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-white text-xs truncate">{issue.title}</span>
                          <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-rose-400 shrink-0" />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {issue.issue === 'no_episodes'
                            ? 'No episodes uploaded'
                            : issue.issue === 'no_servers'
                            ? `No servers on: ${(issue.zero_server_episodes || []).slice(0, 5).join(', ')}`
                            : `Missing ${issue.missing_count}: ${issue.missing_numbers.slice(0, 6).join(', ')}${
                                issue.missing_count > 6 ? '…' : ''
                              }`}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {m.actions && m.actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {m.actions.map((a, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAction(a)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/20"
                      >
                        {a.type === 'open_episodes' && <Tv className="h-3 w-3" />}
                        {a.type === 'open_cms' && <Film className="h-3 w-3" />}
                        {a.type === 'open_stats' && <BarChart2 className="h-3 w-3" />}
                        {a.type === 'open_anikoto' && <Sparkles className="h-3 w-3" />}
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-slate-400 text-xs flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="border-t border-white/10 p-3 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Ask e.g. "Where are episodes missing?" or "Missing for One Piece"'
            className="flex-1 rounded-2xl border border-white/10 bg-[#08080c] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 px-4 text-white transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        Assistant reads your Supabase catalog only. It does not auto-upload episodes — you stay in control.
      </p>
    </div>
  );
}
