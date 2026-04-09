'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ChoreographerNavbar from '@/components/ChoreographerNavbar';

interface ThreadItem {
  threadId: string;
  unreadCount: number;
  otherUser: {
    id: string;
    fullName: string;
    profileImage?: string;
    role?: string;
  };
  lastMessage: {
    id: string;
    text: string;
    createdAt: string;
    fromUserId: string;
  } | null;
  recentSession?: {
    id: string;
    date: string;
    time: string;
    status: string;
    paymentStatus: string;
  } | null;
}

interface InboxMessage {
  id: string;
  text: string;
  createdAt: string;
  isOwn: boolean;
  fromUser: {
    id: string;
    fullName: string;
    profileImage?: string;
  };
}

export default function ChoreographerInboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedUserId = searchParams?.get('userId') || '';

  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState('');
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const activeThread = useMemo(
    () => threads.find((thread) => thread.threadId === activeThreadId) || null,
    [threads, activeThreadId]
  );

  const loadThreads = async () => {
    try {
      setLoadingThreads(true);
      const res = await fetch('/api/inbox/threads', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load inbox');
      const items: ThreadItem[] = Array.isArray(data?.threads) ? data.threads : [];
      setThreads(items);

      if (requestedUserId && items.some((thread) => thread.threadId === requestedUserId)) {
        setActiveThreadId(requestedUserId);
      } else if (!activeThreadId && items.length > 0) {
        setActiveThreadId(items[0].threadId);
      } else if (activeThreadId && !items.some((thread) => thread.threadId === activeThreadId)) {
        setActiveThreadId(items[0]?.threadId || '');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load inbox');
    } finally {
      setLoadingThreads(false);
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      if (!threadId) return;
      setLoadingMessages(true);
      const res = await fetch(`/api/inbox/messages?userId=${encodeURIComponent(threadId)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to load messages');
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadThreads();
    const timer = setInterval(loadThreads, 8000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeThreadId) {
      loadMessages(activeThreadId);
      const timer = setInterval(() => loadMessages(activeThreadId), 5000);
      return () => clearInterval(timer);
    }
  }, [activeThreadId]);

  const sendMessage = async () => {
    if (!activeThreadId || !draft.trim()) return;
    try {
      setSending(true);
      const res = await fetch('/api/inbox/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toUserId: activeThreadId,
          text: draft.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to send message');
      setDraft('');
      await loadMessages(activeThreadId);
      await loadThreads();
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f6f7fb', fontFamily: "'Manrope', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        .page { max-width: 1200px; margin: 0 auto; padding: 24px; }
        .layout { display: grid; grid-template-columns: 320px 1fr; gap: 16px; min-height: calc(100vh - 130px); }
        .card { background: #fff; border: 1px solid #e7e9f0; border-radius: 16px; overflow: hidden; }
        .thread-head { padding: 14px 16px; border-bottom: 1px solid #eef1f6; font-weight: 700; color: #111827; }
        .thread { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; cursor: pointer; }
        .thread.active { background: #f8faff; }
        .thread-name { font-weight: 700; font-size: 14px; color: #111827; }
        .thread-meta { margin-top: 4px; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; gap: 8px; }
        .unread { background: #111827; color: #fff; border-radius: 999px; font-size: 10px; font-weight: 700; padding: 2px 7px; }
        .chat-head { padding: 14px 16px; border-bottom: 1px solid #eef1f6; display: flex; align-items: center; justify-content: space-between; gap: 14px; }
        .chat-name { font-size: 18px; font-weight: 700; color: #111827; }
        .chat-sub { font-size: 12px; color: #64748b; margin-top: 3px; }
        .messages { padding: 14px; display: flex; flex-direction: column; gap: 10px; height: calc(100vh - 280px); overflow-y: auto; }
        .bubble { max-width: 74%; padding: 10px 12px; border-radius: 12px; font-size: 13px; line-height: 1.4; }
        .bubble.own { align-self: flex-end; background: #111827; color: #fff; border-bottom-right-radius: 4px; }
        .bubble.other { align-self: flex-start; background: #f3f4f6; color: #0f172a; border-bottom-left-radius: 4px; }
        .bubble-time { margin-top: 4px; font-size: 10px; opacity: 0.8; }
        .composer { border-top: 1px solid #eef1f6; padding: 12px; display: flex; gap: 10px; }
        .input { flex: 1; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px; font-size: 13px; }
        .btn { border: none; background: #111827; color: #fff; border-radius: 12px; padding: 10px 14px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .empty { color: #94a3b8; font-size: 13px; padding: 16px; }
        @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } .messages { height: 360px; } }
      `}</style>

      <ChoreographerNavbar subtitle="Choreographer" />

      <div className="page">
        {error && (
          <div className="card" style={{ marginBottom: 12, color: '#b91c1c', padding: 12 }}>
            {error}
          </div>
        )}
        <div className="layout">
          <div className="card">
            <div className="thread-head">Conversations</div>
            {loadingThreads ? (
              <div className="empty">Loading inbox...</div>
            ) : threads.length === 0 ? (
              <div className="empty">No conversations yet.</div>
            ) : (
              threads.map((thread) => (
                <div
                  key={thread.threadId}
                  className={`thread ${activeThreadId === thread.threadId ? 'active' : ''}`}
                  onClick={() => setActiveThreadId(thread.threadId)}
                >
                  <div className="thread-name">{thread.otherUser.fullName}</div>
                  <div className="thread-meta">
                    <span>{thread.lastMessage?.text || 'Start the conversation'}</span>
                    {thread.unreadCount > 0 && <span className="unread">{thread.unreadCount}</span>}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="card">
            {!activeThread ? (
              <div className="empty">Select a conversation to start chatting.</div>
            ) : (
              <>
                <div className="chat-head">
                  <div>
                    <div className="chat-name">{activeThread.otherUser.fullName}</div>
                    <div className="chat-sub">
                      Latest session: {activeThread.recentSession?.date || 'N/A'} at {activeThread.recentSession?.time || 'N/A'}
                    </div>
                  </div>
                  <button
                    className="btn"
                    onClick={() => router.push(`/client/${activeThread.otherUser.id}`)}
                  >
                    View Client Profile
                  </button>
                </div>
                <div className="messages">
                  {loadingMessages ? (
                    <div className="empty">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="empty">No messages yet. Say hello.</div>
                  ) : (
                    messages.map((message) => (
                      <div key={message.id} className={`bubble ${message.isOwn ? 'own' : 'other'}`}>
                        <div>{message.text}</div>
                        <div className="bubble-time">
                          {new Date(message.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="composer">
                  <input
                    className="input"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Type your message..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <button className="btn" onClick={sendMessage} disabled={sending}>
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
