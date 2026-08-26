'use client';

import { useEffect, useState } from 'react';
import {
  Award, Users, Gift, Megaphone, Ticket, Building2, Plus, Pencil, Settings as SettingsIcon, Briefcase,
} from 'lucide-react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';

interface Stats {
  members_by_tier: Record<string, number>;
  points_awarded: number;
  points_redeemed: number;
  vouchers_issued: number;
  vouchers_used: number;
  vouchers_available: number;
  participating_establishments: number;
  total_establishments: number;
}

interface Tier {
  id: number;
  key: string;
  label: string;
  min_points: number;
  sort_order: number;
  active: boolean;
}

interface RewardTier {
  id: number;
  points_required: number;
  discount_percent: number;
  sort_order: number;
  active: boolean;
}

interface Campaign {
  id: number;
  name: string;
  type: string;
  multiplier: number | null;
  bonus_points: number | null;
  starts_at: string;
  ends_at: string;
  active: boolean;
}

interface Voucher {
  id: number;
  code: string;
  discount_percent: number;
  status: string;
  issued_at: string;
  expires_at: string | null;
  user: { id: number; name: string; email: string } | null;
}

interface Establishment {
  id: number;
  name: string;
  city: string | null;
  host_name: string | null;
  joined_at: string;
}

interface CorporateRewardTier {
  id: number;
  revenue_threshold: number;
  reward_label: string;
  sort_order: number;
  active: boolean;
}

interface CorporateAnnualReward {
  id: number;
  year: number;
  revenue_total: number;
  reward_label: string | null;
  owner: { id: number; name: string; company_name: string | null; email: string } | null;
  reward_tier: { id: number; reward_label: string } | null;
}

const CAMPAIGN_TYPES = [
  { value: 'double_points', label: 'Points doublés' },
  { value: 'triple_points', label: 'Points triplés' },
  { value: 'weekend_bonus', label: 'Bonus week-end' },
  { value: 'vacances_bonus', label: 'Bonus vacances' },
  { value: 'custom', label: 'Personnalisée' },
];

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminProgrammePage() {
  const { showSuccess, showError } = useToast();

  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [tierModal, setTierModal] = useState<Tier | 'new' | null>(null);
  const [tierForm, setTierForm] = useState({ key: '', label: '', min_points: 0, active: true });
  const [tierSaving, setTierSaving] = useState(false);

  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);
  const [rewardTiersLoading, setRewardTiersLoading] = useState(true);
  const [rewardModal, setRewardModal] = useState<RewardTier | 'new' | null>(null);
  const [rewardForm, setRewardForm] = useState({ points_required: 0, discount_percent: 0, active: true });
  const [rewardSaving, setRewardSaving] = useState(false);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignModal, setCampaignModal] = useState<Campaign | 'new' | null>(null);
  const [campaignForm, setCampaignForm] = useState({ name: '', type: 'custom', multiplier: '', bonus_points: '', starts_at: '', ends_at: '', active: true });
  const [campaignSaving, setCampaignSaving] = useState(false);

  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(true);
  const [voucherPage, setVoucherPage] = useState(1);
  const [voucherLastPage, setVoucherLastPage] = useState(1);

  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [establishmentsLoading, setEstablishmentsLoading] = useState(true);

  const [corporateTiers, setCorporateTiers] = useState<CorporateRewardTier[]>([]);
  const [corporateTiersLoading, setCorporateTiersLoading] = useState(true);
  const [corporateTierModal, setCorporateTierModal] = useState<CorporateRewardTier | 'new' | null>(null);
  const [corporateTierForm, setCorporateTierForm] = useState({ revenue_threshold: 0, reward_label: '', active: true });
  const [corporateTierSaving, setCorporateTierSaving] = useState(false);

  const [annualRewards, setAnnualRewards] = useState<CorporateAnnualReward[]>([]);
  const [annualRewardsLoading, setAnnualRewardsLoading] = useState(true);
  const [annualRewardsPage, setAnnualRewardsPage] = useState(1);
  const [annualRewardsLastPage, setAnnualRewardsLastPage] = useState(1);
  const [annualRewardsYear, setAnnualRewardsYear] = useState('');

  const [loyaltySettings, setLoyaltySettings] = useState({
    loyalty_points_per_fcfa: 0.001,
    loyalty_first_booking_bonus: 0,
    loyalty_birthday_bonus: 50,
    loyalty_review_bonus: 50,
    loyalty_referral_bonus_parrain: 50,
    loyalty_referral_bonus_filleul: 50,
    loyalty_voucher_validity_days: 180,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);

  const loadStats = () => {
    setStatsLoading(true);
    api.get('/admin/loyalty/stats').then((r) => setStats(r.data?.data ?? null)).catch(() => setStats(null)).finally(() => setStatsLoading(false));
  };
  const loadTiers = () => {
    setTiersLoading(true);
    api.get('/admin/loyalty/tiers').then((r) => setTiers(r.data?.data ?? [])).catch(() => setTiers([])).finally(() => setTiersLoading(false));
  };
  const loadRewardTiers = () => {
    setRewardTiersLoading(true);
    api.get('/admin/loyalty/reward-tiers').then((r) => setRewardTiers(r.data?.data ?? [])).catch(() => setRewardTiers([])).finally(() => setRewardTiersLoading(false));
  };
  const loadCampaigns = () => {
    setCampaignsLoading(true);
    api.get('/admin/loyalty/campaigns').then((r) => setCampaigns(r.data?.data ?? [])).catch(() => setCampaigns([])).finally(() => setCampaignsLoading(false));
  };
  const loadEstablishments = () => {
    setEstablishmentsLoading(true);
    api.get('/admin/loyalty/establishments').then((r) => setEstablishments(r.data?.data ?? [])).catch(() => setEstablishments([])).finally(() => setEstablishmentsLoading(false));
  };
  const loadCorporateTiers = () => {
    setCorporateTiersLoading(true);
    api.get('/admin/corporate/reward-tiers').then((r) => setCorporateTiers(r.data?.data ?? [])).catch(() => setCorporateTiers([])).finally(() => setCorporateTiersLoading(false));
  };
  const loadSettings = () => {
    setSettingsLoading(true);
    api.get('/settings/admin')
      .then((r) => {
        const d = r.data || {};
        setLoyaltySettings({
          loyalty_points_per_fcfa: d.loyalty_points_per_fcfa ?? 0.001,
          loyalty_first_booking_bonus: d.loyalty_first_booking_bonus ?? 0,
          loyalty_birthday_bonus: d.loyalty_birthday_bonus ?? 50,
          loyalty_review_bonus: d.loyalty_review_bonus ?? 50,
          loyalty_referral_bonus_parrain: d.loyalty_referral_bonus_parrain ?? 50,
          loyalty_referral_bonus_filleul: d.loyalty_referral_bonus_filleul ?? 50,
          loyalty_voucher_validity_days: d.loyalty_voucher_validity_days ?? 180,
        });
      })
      .catch(() => {})
      .finally(() => setSettingsLoading(false));
  };
  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await api.put('/settings/admin', loyaltySettings);
      showSuccess('Réglages enregistrés.');
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l’enregistrement.');
    } finally {
      setSettingsSaving(false);
    }
  };

  useEffect(() => { loadStats(); loadTiers(); loadRewardTiers(); loadCampaigns(); loadEstablishments(); loadSettings(); loadCorporateTiers(); }, []);

  useEffect(() => {
    setVouchersLoading(true);
    api.get('/admin/loyalty/vouchers', { params: { page: voucherPage } })
      .then((r) => { setVouchers(r.data?.data ?? []); setVoucherLastPage(r.data?.pagination?.last_page ?? 1); })
      .catch(() => setVouchers([]))
      .finally(() => setVouchersLoading(false));
  }, [voucherPage]);

  useEffect(() => {
    setAnnualRewardsLoading(true);
    api.get('/admin/corporate/annual-rewards', { params: { page: annualRewardsPage, year: annualRewardsYear || undefined } })
      .then((r) => { setAnnualRewards(r.data?.data ?? []); setAnnualRewardsLastPage(r.data?.pagination?.last_page ?? 1); })
      .catch(() => setAnnualRewards([]))
      .finally(() => setAnnualRewardsLoading(false));
  }, [annualRewardsPage, annualRewardsYear]);

  // ─── Niveaux ─────────────────────────────────────────────────────────

  const openTierModal = (tier: Tier | 'new') => {
    if (tier === 'new') {
      setTierForm({ key: '', label: '', min_points: 0, active: true });
    } else {
      setTierForm({ key: tier.key, label: tier.label, min_points: tier.min_points, active: tier.active });
    }
    setTierModal(tier);
  };

  const saveTier = async () => {
    setTierSaving(true);
    try {
      if (tierModal === 'new') {
        await api.post('/admin/loyalty/tiers', tierForm);
        showSuccess('Niveau créé.');
      } else if (tierModal) {
        await api.put(`/admin/loyalty/tiers/${tierModal.id}`, {
          label: tierForm.label, min_points: tierForm.min_points, active: tierForm.active,
        });
        showSuccess('Niveau mis à jour.');
      }
      setTierModal(null);
      loadTiers();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l’enregistrement.');
    } finally {
      setTierSaving(false);
    }
  };

  // ─── Récompenses ─────────────────────────────────────────────────────

  const openRewardModal = (rt: RewardTier | 'new') => {
    if (rt === 'new') {
      setRewardForm({ points_required: 0, discount_percent: 0, active: true });
    } else {
      setRewardForm({ points_required: rt.points_required, discount_percent: rt.discount_percent, active: rt.active });
    }
    setRewardModal(rt);
  };

  const saveReward = async () => {
    setRewardSaving(true);
    try {
      if (rewardModal === 'new') {
        await api.post('/admin/loyalty/reward-tiers', rewardForm);
        showSuccess('Récompense créée.');
      } else if (rewardModal) {
        await api.put(`/admin/loyalty/reward-tiers/${rewardModal.id}`, {
          discount_percent: rewardForm.discount_percent, active: rewardForm.active,
        });
        showSuccess('Récompense mise à jour.');
      }
      setRewardModal(null);
      loadRewardTiers();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l’enregistrement.');
    } finally {
      setRewardSaving(false);
    }
  };

  // ─── Programme Corporate (paliers de CA annuel) ─────────────────────

  const openCorporateTierModal = (rt: CorporateRewardTier | 'new') => {
    if (rt === 'new') {
      setCorporateTierForm({ revenue_threshold: 0, reward_label: '', active: true });
    } else {
      setCorporateTierForm({ revenue_threshold: rt.revenue_threshold, reward_label: rt.reward_label, active: rt.active });
    }
    setCorporateTierModal(rt);
  };

  const saveCorporateTier = async () => {
    setCorporateTierSaving(true);
    try {
      if (corporateTierModal === 'new') {
        await api.post('/admin/corporate/reward-tiers', corporateTierForm);
        showSuccess('Palier Corporate créé.');
      } else if (corporateTierModal) {
        await api.put(`/admin/corporate/reward-tiers/${corporateTierModal.id}`, corporateTierForm);
        showSuccess('Palier Corporate mis à jour.');
      }
      setCorporateTierModal(null);
      loadCorporateTiers();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l’enregistrement.');
    } finally {
      setCorporateTierSaving(false);
    }
  };

  // ─── Campagnes ───────────────────────────────────────────────────────

  const openCampaignModal = (c: Campaign | 'new') => {
    if (c === 'new') {
      setCampaignForm({ name: '', type: 'custom', multiplier: '', bonus_points: '', starts_at: '', ends_at: '', active: true });
    } else {
      setCampaignForm({
        name: c.name, type: c.type,
        multiplier: c.multiplier != null ? String(c.multiplier) : '',
        bonus_points: c.bonus_points != null ? String(c.bonus_points) : '',
        starts_at: c.starts_at?.slice(0, 10) ?? '',
        ends_at: c.ends_at?.slice(0, 10) ?? '',
        active: c.active,
      });
    }
    setCampaignModal(c);
  };

  const saveCampaign = async () => {
    setCampaignSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: campaignForm.name,
        starts_at: campaignForm.starts_at,
        ends_at: campaignForm.ends_at,
        active: campaignForm.active,
        multiplier: campaignForm.multiplier ? Number(campaignForm.multiplier) : null,
        bonus_points: campaignForm.bonus_points ? Number(campaignForm.bonus_points) : null,
      };
      if (campaignModal === 'new') {
        payload.type = campaignForm.type;
        await api.post('/admin/loyalty/campaigns', payload);
        showSuccess('Campagne créée.');
      } else if (campaignModal) {
        await api.put(`/admin/loyalty/campaigns/${campaignModal.id}`, payload);
        showSuccess('Campagne mise à jour.');
      }
      setCampaignModal(null);
      loadCampaigns();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de l’enregistrement.');
    } finally {
      setCampaignSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Award className="w-6 h-6 text-primary" /> Membre du programme
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Niveaux, récompenses, campagnes et bons du Programme Membre, ainsi que les paliers de CA annuel du Programme Corporate.
        </p>
      </div>

      {/* Statistiques */}
      <section>
        {statsLoading ? (
          <div className="p-8"><LoadingSpinner /></div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Points attribués', value: stats.points_awarded },
              { label: 'Points échangés', value: stats.points_redeemed },
              { label: 'Bons émis', value: stats.vouchers_issued },
              { label: 'Bons utilisés', value: stats.vouchers_used },
              { label: 'Bons disponibles', value: stats.vouchers_available },
              { label: 'Établissements participants', value: `${stats.participating_establishments}/${stats.total_establishments}` },
            ].map((s) => (
              <div key={s.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <p className="text-xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Erreur de chargement des statistiques.</p>
        )}
      </section>

      {/* Niveaux */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" /> Niveaux
          </h2>
          <button onClick={() => openTierModal('new')} className="btn-outline text-xs inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Ajouter un niveau
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {tiersLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : tiers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-8 text-center">Aucun niveau configuré.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {tiers.map((t) => (
                <div key={t.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{t.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      dès {t.min_points} points · {t.active ? (
                        <span className="text-green-700 dark:text-green-400">actif</span>
                      ) : (
                        <span className="text-gray-400">inactif</span>
                      )}
                    </p>
                  </div>
                  <button onClick={() => openTierModal(t)} className="text-gray-400 hover:text-primary">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Récompenses */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-primary" /> Récompenses (paliers cagnotte)
          </h2>
          <button onClick={() => openRewardModal('new')} className="btn-outline text-xs inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Ajouter une récompense
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {rewardTiersLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : rewardTiers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-8 text-center">Aucune récompense configurée.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {rewardTiers.map((rt) => (
                <div key={rt.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">-{rt.discount_percent}% de réduction</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {rt.points_required} points · {rt.active ? (
                        <span className="text-green-700 dark:text-green-400">actif</span>
                      ) : (
                        <span className="text-gray-400">inactif</span>
                      )}
                    </p>
                  </div>
                  <button onClick={() => openRewardModal(rt)} className="text-gray-400 hover:text-primary">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Campagnes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Megaphone className="w-4 h-4 text-primary" /> Campagnes
          </h2>
          <button onClick={() => openCampaignModal('new')} className="btn-outline text-xs inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Créer une campagne
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {campaignsLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-8 text-center">Aucune campagne pour le moment.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {campaigns.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{c.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {CAMPAIGN_TYPES.find((ct) => ct.value === c.type)?.label ?? c.type} · du {fmtDate(c.starts_at)} au {fmtDate(c.ends_at)} ·{' '}
                      {c.active ? <span className="text-green-700 dark:text-green-400">active</span> : <span className="text-gray-400">inactive</span>}
                    </p>
                  </div>
                  <button onClick={() => openCampaignModal(c)} className="text-gray-400 hover:text-primary">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Bons émis */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Ticket className="w-4 h-4 text-primary" /> Bons émis
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {vouchersLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : vouchers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-8 text-center">Aucun bon émis pour le moment.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {vouchers.map((v) => (
                <div key={v.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-900 dark:text-white">{v.code}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {v.user?.name ?? 'Utilisateur supprimé'} · -{v.discount_percent}% · émis le {fmtDate(v.issued_at)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium ${
                    v.status === 'available' ? 'text-green-700 dark:text-green-400' : v.status === 'used' ? 'text-gray-400' : 'text-red-500'
                  }`}>
                    {v.status === 'available' ? 'Disponible' : v.status === 'used' ? 'Utilisé' : 'Expiré'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {voucherLastPage > 1 && (
          <Pagination currentPage={voucherPage} totalPages={voucherLastPage} onPageChange={setVoucherPage} />
        )}
      </section>

      {/* Établissements participants */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-primary" /> Établissements participants
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {establishmentsLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : establishments.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-8 text-center">Aucun établissement participant pour le moment.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {establishments.map((e) => (
                <div key={e.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{e.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {e.host_name ?? '—'} {e.city && `· ${e.city}`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">depuis le {fmtDate(e.joined_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Programme Corporate — Paliers de CA annuel */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-primary" /> Programme Corporate — Paliers de CA annuel
          </h2>
          <button onClick={() => openCorporateTierModal('new')} className="btn-outline text-xs inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Ajouter un palier
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {corporateTiersLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : corporateTiers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-8 text-center">Aucun palier Corporate configuré.</p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {corporateTiers.map((rt) => (
                <div key={rt.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{rt.reward_label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      dès {formatPrice(rt.revenue_threshold)} F de CA annuel · {rt.active ? (
                        <span className="text-green-700 dark:text-green-400">actif</span>
                      ) : (
                        <span className="text-gray-400">inactif</span>
                      )}
                    </p>
                  </div>
                  <button onClick={() => openCorporateTierModal(rt)} className="text-gray-400 hover:text-primary">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Programme Corporate — Récompenses annuelles figées */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
            <Award className="w-4 h-4 text-primary" /> Bilans Corporate figés
          </h2>
          <input
            type="number"
            placeholder="Filtrer par année"
            value={annualRewardsYear}
            onChange={(e) => { setAnnualRewardsYear(e.target.value); setAnnualRewardsPage(1); }}
            className="w-40 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-xs text-gray-900 dark:text-white"
          />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
          {annualRewardsLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : annualRewards.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 p-8 text-center">
              Aucun bilan Corporate figé pour le moment (calculé par la commande annuelle corporate:compute-annual-rewards).
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {annualRewards.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {r.owner?.company_name || r.owner?.name || 'Entreprise supprimée'} · {r.year}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {formatPrice(r.revenue_total)} F de CA — {r.reward_label || 'aucun palier atteint'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {annualRewardsLastPage > 1 && (
          <Pagination currentPage={annualRewardsPage} totalPages={annualRewardsLastPage} onPageChange={setAnnualRewardsPage} />
        )}
      </section>

      {/* Réglages */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <SettingsIcon className="w-4 h-4 text-primary" /> Réglages des bonus et points
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
          {settingsLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  ['loyalty_points_per_fcfa', 'Points par FCFA dépensé', 0.0001],
                  ['loyalty_first_booking_bonus', 'Bonus première réservation (points)', 1],
                  ['loyalty_birthday_bonus', "Bonus d'anniversaire (points)", 1],
                  ['loyalty_review_bonus', 'Bonus avis publié (points)', 1],
                  ['loyalty_referral_bonus_parrain', 'Bonus parrainage — parrain (points)', 1],
                  ['loyalty_referral_bonus_filleul', 'Bonus parrainage — filleul (points)', 1],
                  ['loyalty_voucher_validity_days', 'Validité des bons (jours)', 1],
                ] as const).map(([key, label, step]) => (
                  <label key={key} className="block">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</span>
                    <input
                      type="number"
                      step={step}
                      min={0}
                      value={loyaltySettings[key]}
                      onChange={(e) => setLoyaltySettings({ ...loyaltySettings, [key]: Number(e.target.value) })}
                      className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={saveSettings}
                  disabled={settingsSaving}
                  className="btn-primary text-xs inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {settingsSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Modal Niveau */}
      {tierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">{tierModal === 'new' ? 'Nouveau niveau' : 'Modifier le niveau'}</h3>
            <div className="space-y-4">
              {tierModal === 'new' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Clé (identifiant technique)</label>
                  <input type="text" value={tierForm.key} onChange={(e) => setTierForm({ ...tierForm, key: e.target.value })}
                    placeholder="ex : diamant" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Libellé</label>
                <input type="text" value={tierForm.label} onChange={(e) => setTierForm({ ...tierForm, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Points minimum requis</label>
                <input type="number" min={0} value={tierForm.min_points} onChange={(e) => setTierForm({ ...tierForm, min_points: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={tierForm.active} onChange={(e) => setTierForm({ ...tierForm, active: e.target.checked })} />
                Actif
              </label>
              <div className="flex gap-3">
                <button onClick={() => setTierModal(null)} className="flex-1 btn-secondary">Annuler</button>
                <button onClick={saveTier} disabled={tierSaving} className="flex-1 btn-primary disabled:opacity-50">
                  {tierSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Récompense */}
      {rewardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">{rewardModal === 'new' ? 'Nouvelle récompense' : 'Modifier la récompense'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Points requis</label>
                <input type="number" min={1} value={rewardForm.points_required} disabled={rewardModal !== 'new'}
                  onChange={(e) => setRewardForm({ ...rewardForm, points_required: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm disabled:opacity-50" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Réduction accordée (%)</label>
                <input type="number" min={0} max={100} step={0.5} value={rewardForm.discount_percent}
                  onChange={(e) => setRewardForm({ ...rewardForm, discount_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={rewardForm.active} onChange={(e) => setRewardForm({ ...rewardForm, active: e.target.checked })} />
                Actif
              </label>
              <div className="flex gap-3">
                <button onClick={() => setRewardModal(null)} className="flex-1 btn-secondary">Annuler</button>
                <button onClick={saveReward} disabled={rewardSaving} className="flex-1 btn-primary disabled:opacity-50">
                  {rewardSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Palier Corporate */}
      {corporateTierModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">{corporateTierModal === 'new' ? 'Nouveau palier Corporate' : 'Modifier le palier Corporate'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">CA annuel requis (FCFA)</label>
                <input type="number" min={0} step={1} value={corporateTierForm.revenue_threshold}
                  onChange={(e) => setCorporateTierForm({ ...corporateTierForm, revenue_threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Récompense (libellé)</label>
                <input type="text" value={corporateTierForm.reward_label} placeholder="ex : Bon Corporate de 50 000 FCFA"
                  onChange={(e) => setCorporateTierForm({ ...corporateTierForm, reward_label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={corporateTierForm.active} onChange={(e) => setCorporateTierForm({ ...corporateTierForm, active: e.target.checked })} />
                Actif
              </label>
              <div className="flex gap-3">
                <button onClick={() => setCorporateTierModal(null)} className="flex-1 btn-secondary">Annuler</button>
                <button onClick={saveCorporateTier} disabled={corporateTierSaving} className="flex-1 btn-primary disabled:opacity-50">
                  {corporateTierSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Campagne */}
      {campaignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">{campaignModal === 'new' ? 'Nouvelle campagne' : 'Modifier la campagne'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom</label>
                <input type="text" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
              </div>
              {campaignModal === 'new' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select value={campaignForm.type} onChange={(e) => setCampaignForm({ ...campaignForm, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm">
                    {CAMPAIGN_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Multiplicateur</label>
                  <input type="number" min={0} step={0.1} value={campaignForm.multiplier}
                    onChange={(e) => setCampaignForm({ ...campaignForm, multiplier: e.target.value })} placeholder="ex : 2"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Points bonus</label>
                  <input type="number" min={0} value={campaignForm.bonus_points}
                    onChange={(e) => setCampaignForm({ ...campaignForm, bonus_points: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Début</label>
                  <input type="date" value={campaignForm.starts_at} onChange={(e) => setCampaignForm({ ...campaignForm, starts_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fin</label>
                  <input type="date" value={campaignForm.ends_at} onChange={(e) => setCampaignForm({ ...campaignForm, ends_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={campaignForm.active} onChange={(e) => setCampaignForm({ ...campaignForm, active: e.target.checked })} />
                Active
              </label>
              <div className="flex gap-3">
                <button onClick={() => setCampaignModal(null)} className="flex-1 btn-secondary">Annuler</button>
                <button onClick={saveCampaign} disabled={campaignSaving} className="flex-1 btn-primary disabled:opacity-50">
                  {campaignSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
