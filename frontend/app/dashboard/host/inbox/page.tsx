'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import Footer from '@/components/common/Footer';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Link from 'next/link';
import { ArrowLeft, Inbox, MessageSquare, Send } from 'lucide-react';

interface Message {
  id: number;
  subject: string | null;
  body: string;
  is_from_platform: boolean;
  read_at: string | null;
  created_at: string;
  sender: { id: number; name: string; email?: string } | null;
  replies?: Array<{
    id: number;
    body: string;
    created_at: string;
    sender: { id: number; name: string } | null;
  }>;
}

export default function HostInboxPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'host') {
      router.push('/auth/login');
      return;
    }
    fetchInbox();
  }, [authLoading, isAuthenticated, user]);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/host/inbox', { params: { per_page: 50 } });
      const data = res.data?.data ?? res.data;
      setMessages(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des messages.');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyingId || !replyBody.trim()) return;
    try {
      setSaving(true);
      await api.post('/host/inbox', { parent_id: replyingId, body: replyBody.trim() });
      setReplyBody('');
      setReplyingId(null);
      await fetchInbox();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi de la réponse.');
    } finally {
      setSaving(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.patch(`/host/inbox/${id}/read`);
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read_at: m.read_at || new Date().toISOString() } : m))
      );
    } catch {
      // ignore
    }
  };

  if (authLoading || (loading && messages.length === 0)) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <LoadingSpinner message="Chargement de la boîte de réception..." size="lg" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/dashboard/host"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-primary mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au tableau de bord
          </Link>

          <h1 className="text-3xl font-bold mb-2">Boîte de réception</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Messages de la plateforme et des voyageurs. Répondez directement depuis ici.
          </p>

          <ErrorDisplay error={error} onDismiss={() => setError(null)} type="error" />

          {messages.length === 0 ? (
            <div className="card text-center py-12">
              <Inbox className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Aucun message pour le moment.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Les messages de la plateforme et des voyageurs apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`card ${!msg.read_at ? 'border-l-4 border-l-primary' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {msg.is_from_platform ? 'Plateforme Bosejour' : msg.sender?.name ?? 'Voyageur'}
                        </span>
                        {!msg.read_at && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Nouveau</span>
                        )}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(msg.created_at).toLocaleDateString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      {msg.subject && (
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{msg.subject}</p>
                      )}
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{msg.body}</p>

                      {msg.replies && msg.replies.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {msg.replies.map((r) => (
                            <div
                              key={r.id}
                              className="pl-4 border-l-2 border-primary/30 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg p-3"
                            >
                              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{r.body}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {r.sender?.name ?? 'Vous'} · {new Date(r.created_at).toLocaleDateString('fr-FR', { dateStyle: 'short' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {!msg.is_from_platform && msg.sender != null && (
                        <>
                          {replyingId !== msg.id && (
                            <button
                              type="button"
                              onClick={() => { setReplyingId(msg.id); markAsRead(msg.id); }}
                              className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Répondre
                            </button>
                          )}
                          {replyingId === msg.id && (
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Votre réponse</label>
                              <textarea
                                value={replyBody}
                                onChange={(e) => setReplyBody(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                                placeholder="Écrivez votre message..."
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={handleReply}
                                  disabled={saving || !replyBody.trim()}
                                  className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
                                >
                                  <Send className="w-4 h-4" />
                                  {saving ? 'Envoi...' : 'Envoyer'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setReplyingId(null); setReplyBody(''); }}
                                  className="btn-secondary text-sm"
                                >
                                  Annuler
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      {msg.is_from_platform && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                          Pour toute question à la plateforme, contactez le support.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
