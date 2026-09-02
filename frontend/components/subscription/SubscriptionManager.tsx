'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useToast } from '@/components/common/ToastContext';
import { formatPrice } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Subscription {
  id: number;
  accommodation_id: number;
  accommodation?: {
    id: number;
    name: string;
  };
  plan: 'free' | 'gold' | 'diamond';
  starts_at: string;
  expires_at: string;
  status: 'active' | 'expired' | 'cancelled';
  amount_paid: number;
}

interface SubscriptionManagerProps {
  accommodationId?: number;
}

export default function SubscriptionManager({ accommodationId }: SubscriptionManagerProps) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'gold' | 'diamond'>('gold');
  const [duration, setDuration] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const confirmAction = useConfirm();
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    fetchSubscriptions();
  }, [accommodationId]);

  const fetchSubscriptions = async () => {
    try {
      const response = await api.get('/subscriptions/my');
      setSubscriptions(accommodationId 
        ? response.data.filter((sub: Subscription) => sub.accommodation_id === accommodationId)
        : response.data
      );
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!accommodationId) return;

    setSubmitting(true);
    try {
      await api.post('/subscriptions', {
        accommodation_id: accommodationId,
        plan: selectedPlan,
        duration_months: duration,
      });
      await fetchSubscriptions();
      setShowForm(false);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l\'abonnement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: number) => {
    const ok = await confirmAction({
      title: 'Annuler l\'abonnement',
      message: 'Êtes-vous sûr de vouloir annuler cet abonnement ?',
      confirmLabel: 'Oui, annuler',
      cancelLabel: 'Non',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await api.post(`/subscriptions/${id}/cancel`);
      await fetchSubscriptions();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l\'annulation');
    }
  };

  const getPlanBadge = (plan: string) => {
    const badges = {
      free: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
      gold: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      diamond: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    };
    return badges[plan as keyof typeof badges] || badges.free;
  };

  const getPlanName = (plan: string) => {
    const names = {
      free: 'Gratuit',
      gold: 'Gold',
      diamond: 'Diamant',
    };
    return names[plan as keyof typeof names] || plan;
  };

  const planPrices = {
    gold: 50000,
    diamond: 100000,
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-2xl font-bold">Gestion des abonnements</h2>
        {accommodationId && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Annuler' : 'Nouvel abonnement'}
          </button>
        )}
      </div>

      {showForm && accommodationId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4">Choisir un plan</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Plan</label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value as 'gold' | 'diamond')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="gold">Gold - 50,000 FCFA/mois</option>
                <option value="diamond">Diamant - 100,000 FCFA/mois</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Durée (mois)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
              <div className="flex justify-between">
                <span>Total:</span>
                <span className="font-bold text-lg">
                  {formatPrice(planPrices[selectedPlan] * duration)} FCFA
                </span>
              </div>
            </div>
            <button
              onClick={handleSubscribe}
              disabled={submitting}
              className="w-full btn-primary disabled:opacity-50"
            >
              {submitting ? 'Traitement...' : 'S\'abonner'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {subscriptions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Aucun abonnement actif
          </div>
        ) : (
          subscriptions.map((subscription) => (
            <div
              key={subscription.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlanBadge(subscription.plan)}`}>
                      {getPlanName(subscription.plan)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      subscription.status === 'active' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}>
                      {subscription.status === 'active' ? 'Actif' : subscription.status}
                    </span>
                  </div>
                  {subscription.accommodation && (
                    <p className="text-gray-600 dark:text-gray-400">
                      {subscription.accommodation.name}
                    </p>
                  )}
                </div>
                {subscription.status === 'active' && (
                  <button
                    onClick={() => handleCancel(subscription.id)}
                    className="text-red-600 dark:text-red-400 hover:underline text-sm"
                  >
                    Annuler
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Début</p>
                  <p className="font-medium">
                    {format(new Date(subscription.starts_at), 'dd MMM yyyy', { locale: fr })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Expiration</p>
                  <p className="font-medium">
                    {format(new Date(subscription.expires_at), 'dd MMM yyyy', { locale: fr })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Montant payé</p>
                  <p className="font-medium">{formatPrice(subscription.amount_paid)} FCFA</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

