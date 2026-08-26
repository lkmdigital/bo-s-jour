'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/common/ToastContext';
import MemberAside from '@/components/dashboard/user/MemberAside';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import {
  Award, Gift, TrendingUp, Copy, Ticket, History, Megaphone,
  CheckCircle2, Clock, XCircle,
} from 'lucide-react';

interface Tier {
  key: string;
  label: string;
}

interface NextTier extends Tier {
  min_points: number;
  points_remaining: number;
}

interface RewardTier {
  id: number;
  points_required: number;
  discount_percent: number;
  claimable: boolean;
}

interface Voucher {
  id: number;
  code: string;
  discount_percent: number;
  status: 'available' | 'used' | 'expired';
  issued_at: string;
  expires_at: string | null;
  used_at: string | null;
}

interface ActiveCampaign {
  id: number;
  name: string;
  type: string;
  multiplier: number | null;
  bonus_points: number | null;
  ends_at: string;
}

interface LoyaltyData {
  tier: Tier | null;
  next_tier: NextTier | null;
  points_lifetime: number;
  points_balance: number;
  referral_code: string | null;
  reward_tiers: RewardTier[];
  vouchers: Voucher[];
  active_campaigns: ActiveCampaign[];
}

const CAMPAIGN_TYPE_LABELS: Record<string, string> = {
  double_points: 'Points doublés',
  triple_points: 'Points triplés',
  weekend_bonus: 'Bonus week-end',
  vacances_bonus: 'Bonus vacances',
  custom: 'Offre spéciale',
};

interface HistoryItem {
  id: number;
  points: number;
  type: string;
  label: string;
  description: string | null;
  booking_id: number | null;
  created_at: string;
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  argent: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  or: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  platine: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
};

const VOUCHER_STATUS: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  available: { label: 'Disponible', color: 'text-green-600 dark:text-green-400', icon: CheckCircle2 },
  used: { label: 'Utilisé', color: 'text-gray-400', icon: Clock },
  expired: { label: 'Expiré', color: 'text-red-500', icon: XCircle },
};

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MemberProgrammePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const { showSuccess, showError } = useToast();

  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLastPage, setHistoryLastPage] = useState(1);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/programme');
  }, [isAuthenticated, isLoading, router]);

  const load = () => {
    api.get('/me/loyalty')
      .then((r) => setData(r.data?.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading]);

  const loadHistory = (page: number) => {
    setHistoryLoading(true);
    api.get('/me/loyalty/history', { params: { page } })
      .then((r) => {
        setHistory(r.data?.data ?? []);
        setHistoryLastPage(r.data?.pagination?.last_page ?? 1);
      })
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  };

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    loadHistory(historyPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isLoading, historyPage]);

  const claimVoucher = async (rewardTier: RewardTier) => {
    setClaimingId(rewardTier.id);
    try {
      await api.post('/me/loyalty/claim-voucher', { reward_tier_id: rewardTier.id });
      showSuccess('Votre bon de réduction a été émis avec succès.');
      load();
      loadHistory(historyPage);
    } catch (err: any) {
      showError(err.response?.data?.message || "Impossible de réclamer cette récompense pour le moment.");
    } finally {
      setClaimingId(null);
    }
  };

  const copyReferralCode = () => {
    if (!data?.referral_code) return;
    navigator.clipboard.writeText(data.referral_code).then(() => {
      showSuccess('Code de parrainage copié.');
    });
  };

  if (isLoading || (loading && isAuthenticated)) return <LoadingSpinner message="Chargement de votre programme fidélité…" size="lg" />;
  if (!isAuthenticated) return null;

  const tierKey = data?.tier?.key ?? 'bronze';
  const tierColor = TIER_COLORS[tierKey] ?? TIER_COLORS.bronze;

  const progressPercent = data?.next_tier
    ? Math.min(100, Math.round(((data.points_lifetime) / data.next_tier.min_points) * 100))
    : 100;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Award className="w-7 h-7 text-primary" /> Programme Membre
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Vos points, votre niveau et vos récompenses de fidélité bo séjour.
          </p>
        </div>

        {/* Niveau + progression */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${tierColor}`}>
                {data?.tier?.label ?? 'Bronze'}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Votre niveau actuel</span>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data?.points_balance ?? 0}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">points disponibles</p>
            </div>
          </div>

          {data?.next_tier && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                <span>{data.points_lifetime} pts à vie</span>
                <span>Niveau {data.next_tier.label} dans {data.next_tier.points_remaining} pts</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          )}
          {!data?.next_tier && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> Vous avez atteint le niveau le plus élevé !
            </p>
          )}
        </div>

        {/* Récompenses disponibles */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mb-3">
            <Gift className="w-4 h-4 text-primary" /> Mes récompenses
          </h2>
          {!data?.reward_tiers?.length ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucune récompense disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.reward_tiers.map((rt) => (
                <div key={rt.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 flex flex-col justify-between">
                  <div>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">-{rt.discount_percent}%</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{rt.points_required} points requis</p>
                  </div>
                  <button
                    onClick={() => claimVoucher(rt)}
                    disabled={!rt.claimable || claimingId === rt.id}
                    className="btn-outline text-xs mt-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {claimingId === rt.id ? 'Réclamation…' : rt.claimable ? 'Réclamer' : 'Solde insuffisant'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mes bons */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mb-3">
            <Ticket className="w-4 h-4 text-primary" /> Mes bons de réduction
          </h2>
          {!data?.vouchers?.length ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
              <Ticket className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Vous n&apos;avez pas encore de bon de réduction.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
              {data.vouchers.map((v) => {
                const status = VOUCHER_STATUS[v.status] ?? VOUCHER_STATUS.expired;
                const StatusIcon = status.icon;
                return (
                  <div key={v.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{v.code}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        -{v.discount_percent}% · émis le {fmtDate(v.issued_at)}
                        {v.expires_at && v.status === 'available' && ` · expire le ${fmtDate(v.expires_at)}`}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${status.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" /> {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Historique */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 mb-3">
            <History className="w-4 h-4 text-primary" /> Mon historique
          </h2>
          {historyLoading ? (
            <div className="p-8"><LoadingSpinner size="md" /></div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Aucun mouvement de points pour le moment.</p>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                {history.map((h) => (
                  <div key={h.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">{h.description || h.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(h.created_at)}</p>
                    </div>
                    <span className={`text-sm font-semibold ${h.points >= 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                      {h.points >= 0 ? '+' : ''}{h.points}
                    </span>
                  </div>
                ))}
              </div>
              {historyLastPage > 1 && (
                <div className="mt-3">
                  <Pagination currentPage={historyPage} totalPages={historyLastPage} onPageChange={setHistoryPage} />
                </div>
              )}
            </>
          )}
        </div>

        {/* Campagnes en cours */}
        {(data?.active_campaigns.length ?? 0) > 0 && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-5">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-1.5">
              <Megaphone className="w-4 h-4 text-amber-600" /> Campagnes en cours
            </h3>
            <div className="space-y-2">
              {data!.active_campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-gray-500">
                      {CAMPAIGN_TYPE_LABELS[c.type] ?? c.type}
                      {c.multiplier ? ` · x${c.multiplier}` : ''}
                      {c.bonus_points ? ` · +${c.bonus_points} pts` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">jusqu&apos;au {fmtDate(c.ends_at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parrainage */}
        {data?.referral_code && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-1">Parrainez vos proches</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Partagez votre code et gagnez des points à chaque inscription.
            </p>
            <div className="flex items-center gap-2">
              <code className="px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-mono font-semibold">
                {data.referral_code}
              </code>
              <button onClick={copyReferralCode} className="btn-outline text-xs inline-flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5" /> Copier
              </button>
            </div>
          </div>
        )}
      </div>

      <MemberAside />
    </div>
  );
}
