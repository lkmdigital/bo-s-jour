'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import ErrorDisplay from '@/components/common/ErrorDisplay';
import Link from 'next/link';
import { Inbox, MessageSquare } from 'lucide-react';

interface Message {
  id: number;
  subject: string | null;
  body: string;
  is_from_platform: boolean;
  read_at: string | null;
  created_at: string;
  booking_id: number | null;
  sender: { id: number; name: string; email?: string } | null;
  recipient: { id: number; name: string } | null;
  replies?: Array<{
    id: number;
    body: string;
    created_at: string;
    sender: { id: number; name: string } | null;
  }>;
}

export default function UserInboxPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || user?.role !== 'user') {
      router.push('/auth/login');
      return;
    }
    fetchInbox();
  }, [authLoading, isAuthenticated, user, router]);

  const fetchInbox = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/user/inbox', { params: { per_page: 50 } });
      const data = res.data?.data ?? res.data;
      setMessages(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors du chargement des messages.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (loading && messages.length === 0)) {
    return <LoadingSpinner message="Chargement de vos messages..." size="lg" />;
  }

  if (!isAuthenticated || user?.role !== 'user') {
    return null;
  }

  return (
    <div>
      <main>
        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold mb-2">Mes messages</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            Messages de la plateforme et réponses des hôtes. Pour envoyer un message à un hôte, ouvrez la réservation concernée.
          </p>

          <ErrorDisplay error={error} onDismiss={() => setError(null)} type="error" />

          {messages.length === 0 ? (
            <div className="card text-center py-12">
              <Inbox className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Aucun message.</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Les messages liés à vos réservations et les réponses des hôtes apparaîtront ici.
              </p>
              <Link href="/bookings" className="btn-primary inline-flex items-center gap-2 mt-4">
                <MessageSquare className="w-4 h-4" />
                Voir mes réservations
              </Link>
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
                          {msg.is_from_platform ? 'Plateforme Bosejour' : msg.sender?.name ?? 'Hôte'}
                        </span>
                        {!msg.read_at && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Nouveau</span>
                        )}
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(msg.created_at).toLocaleDateString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                        {msg.booking_id && (
                          <Link
                            href={`/bookings/${msg.booking_id}`}
                            className="text-sm text-primary hover:underline"
                          >
                            Voir la réservation
                          </Link>
                        )}
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
                                {r.sender?.name} · {new Date(r.created_at).toLocaleDateString('fr-FR', { dateStyle: 'short' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.booking_id && (
                        <Link
                          href={`/bookings/${msg.booking_id}`}
                          className="mt-3 inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          Répondre depuis la page réservation
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
