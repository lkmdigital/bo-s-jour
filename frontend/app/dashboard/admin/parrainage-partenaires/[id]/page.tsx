'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, Banknote, CalendarCheck, Copy, Download, ExternalLink, Eye, Gift, MousePointerClick, PauseCircle, PlayCircle, QrCode, Save, Search,
  Star, UserCheck, Users,
} from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import { useToast } from '@/components/common/ToastContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface Person { id: number; name: string; email: string; phone: string | null }
interface BookingRow {
  id: number; number: string | null; accommodation: string | null; city: string | null; check_in: string; check_out: string;
  status: string; status_label: string; total_price: number; discount_amount: number; user_id: number; created_at: string;
}
interface ReferralRow {
  id: number; user: Person | null; registered_at: string; validated_at: string | null; signup_points: number; signup_credited: boolean;
  first_booking: BookingRow | null; booking_points: number; booking_credited: boolean;
  discount_state: 'available' | 'reserved' | 'used' | 'forfeited'; discount_amount: number | null; bookings_count: number;
}
interface Detail {
  id: number; code: string; display_name: string | null; is_active: boolean; created_at: string; status: 'active_account' | 'pending_account';
  claimed_at: string | null; invited_email: string | null; invited_phone: string | null; user: Person | null; link: string; qr_link: string;
  notes: string | null; created_by: string | null;
  report: {
    visits: { total: number; unique_visitors: number; returning_visitors: number; today: number; last_7_days: number; last_30_days: number; by_source: { qr: number; link: number; unknown: number }; first_at: string | null; last_at: string | null };
    funnel: { visitors: number; signups: number; signups_validated: number; bookings: number; rate_signup: number | null; rate_validation: number | null; rate_booking: number | null; rate_global: number | null };
    timeline: { days: number; series: { date: string; visits: number; signups: number; validated: number; bookings: number }[] };
    revenue: { bookings_total: number; bookings_paid: number; bookings_cancelled: number; gross_amount: number; average_basket: number | null; discounts_granted: number; discounts_count: number };
    points: { earned: number; withdrawn: number; pending_account: number; balance: number | null; tier: string | null };
    referrals: ReferralRow[];
    bookings: BookingRow[];
    ledger: { id: number; at: string; points: number; type: string; label: string; description: string | null }[];
    events: { at: string; type: string; label: string }[];
  };
}

const DISCOUNT_LABEL: Record<string, string> = { available: 'Disponible', reserved: 'Sur une réservation', used: 'Utilisée', forfeited: 'Perdue' };
const DISCOUNT_STYLE: Record<string, string> = {
  available: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  reserved: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  used: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  forfeited: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};
const BOOKING_STYLE: Record<string, string> = {
  confirmed: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  completed: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300',
};
const EVENT_DOT: Record<string, string> = { designated: 'bg-gray-400', claimed: 'bg-primary', signup: 'bg-blue-500', validated: 'bg-cyan-500', booking: 'bg-green-500', points: 'bg-amber-500' };

const pct = (v: number | null) => (v === null ? '—' : `${v} %`);
const fcfa = (n: number) => `${formatPrice(n)} FCFA`;
const day = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const dateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function Kpi({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; hint?: string }) {
  return (
    <div className="card !p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-primary" /> {label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function AmbassadorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showError, showSuccess } = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [contact, setContact] = useState({ email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const pngRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api.get(`/admin/referral-partners/${id}`, { params: { days } })
      .then((res) => {
        const d: Detail = res.data.data;
        setData(d);
        setNotes(d.notes ?? '');
        setName(d.display_name ?? '');
        setContact({ email: d.invited_email ?? '', phone: d.invited_phone ?? '' });
      })
      .catch(() => showError("Impossible de charger la fiche de l'ambassadeur"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, days]);

  useEffect(load, [load]);

  // Recharts mesure parfois une largeur nulle au premier affichage : on force un recalcul.
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    return () => clearTimeout(t);
  }, [data]);

  const save = async (payload: Record<string, unknown>, ok: string) => {
    setSaving(true);
    try {
      await api.put(`/admin/referral-partners/${id}`, payload);
      showSuccess(ok);
      load();
    } catch (err: any) {
      const errors = err.response?.data?.errors;
      showError((errors && (Object.values(errors)[0] as string[])[0]) || err.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess('Copié.');
    } catch {
      showError('Impossible de copier automatiquement.');
    }
  };

  const download = (href: string, filename: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.click();
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = data?.report.referrals ?? [];
    return q ? rows.filter((r) => `${r.user?.name} ${r.user?.email} ${r.user?.phone}`.toLowerCase().includes(q)) : rows;
  }, [data, search]);

  const exportReferrals = () => {
    if (!data) return;
    const head = ['Filleul', 'E-mail', 'Téléphone', 'Inscrit le', 'Inscription validée le', 'Points inscription', 'Réservations', '1re réservation (n°)', 'Statut', 'Montant', 'Points réservation', 'Remise de 5 %', 'Remise (FCFA)'];
    const lines = data.report.referrals.map((r) => [
      r.user?.name ?? '', r.user?.email ?? '', r.user?.phone ?? '', day(r.registered_at), day(r.validated_at), r.signup_points, r.bookings_count,
      r.first_booking?.number ?? '', r.first_booking?.status_label ?? '', r.first_booking?.total_price ?? '', r.booking_points, DISCOUNT_LABEL[r.discount_state], r.discount_amount ?? '',
    ]);
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '﻿' + [head, ...lines].map((l) => l.map(esc).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    download(url, `ambassadeur-${data.code}-filleuls-${new Date().toISOString().slice(0, 10)}.csv`);
    URL.revokeObjectURL(url);
  };

  const downloadSvg = () => {
    const svg = svgRef.current?.querySelector('svg');
    if (!svg || !data) return;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
    download(url, `bosejour-qr-${data.code}.svg`);
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="py-16"><LoadingSpinner /></div>;
  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/admin/parrainage-partenaires" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary"><ArrowLeft className="w-4 h-4" /> Retour aux ambassadeurs</Link>
        <p className="card text-sm text-gray-500">Ambassadeur introuvable.</p>
      </div>
    );
  }

  const { report } = data;
  const { visits, funnel, revenue, points } = report;
  const title = data.display_name || data.user?.name || 'Ambassadeur';
  const funnelSteps = [
    { label: 'Visiteurs uniques', value: funnel.visitors, rate: null as number | null },
    { label: 'Inscriptions', value: funnel.signups, rate: funnel.rate_signup },
    { label: 'Inscriptions validées', value: funnel.signups_validated, rate: funnel.rate_validation },
    { label: '1res réservations confirmées', value: funnel.bookings, rate: funnel.rate_booking },
  ];
  const top = Math.max(1, ...funnelSteps.map((s) => s.value));

  return (
    <div className="space-y-6">
      <Link href="/dashboard/admin/parrainage-partenaires" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
        <ArrowLeft className="w-4 h-4" /> Retour aux ambassadeurs
      </Link>

      {/* En-tête */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Fiche ambassadeur</p>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              {data.status === 'pending_account' ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">En attente de son inscription</span>
              ) : data.is_active ? (
                <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400">Actif</span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">Suspendu</span>
              )}
              <span className="text-gray-500">Code <code className="font-mono font-semibold">{data.code}</code></span>
              <span className="text-gray-400">· désigné le {day(data.created_at)}{data.created_by ? ` par ${data.created_by}` : ''}</span>
            </div>
          </div>
          <button
            onClick={() => save({ is_active: !data.is_active }, data.is_active ? 'Ambassadeur suspendu' : 'Ambassadeur réactivé')}
            disabled={saving}
            className="btn-outline inline-flex items-center gap-2 text-sm"
          >
            {data.is_active ? <><PauseCircle className="w-4 h-4" /> Suspendre</> : <><PlayCircle className="w-4 h-4" /> Réactiver</>}
          </button>
        </div>
        {!data.is_active && (
          <p className="mt-3 text-xs rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200 p-3">
            Suspendu : son lien et son QR code mènent toujours à l&apos;inscription, mais ses nouveaux filleuls ne sont plus rattachés, aucune remise n&apos;est accordée et aucun point n&apos;est versé.
          </p>
        )}
      </div>

      {/* Indicateurs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Eye} label="Visiteurs uniques" value={visits.unique_visitors} hint={`${visits.total} visites au total · ${visits.returning_visitors} revenus`} />
        <Kpi icon={QrCode} label="Scans du QR code" value={visits.by_source.qr} hint={visits.by_source.unknown > 0 ? `+ ${visits.by_source.unknown} visites d'origine non distinguée` : undefined} />
        <Kpi icon={MousePointerClick} label="Clics sur le lien" value={visits.by_source.link} />
        <Kpi icon={Users} label="Inscrits" value={funnel.signups} hint={`${funnel.signups_validated} validés · ${pct(funnel.rate_signup)} des visiteurs`} />
        <Kpi icon={CalendarCheck} label="Réservations confirmées" value={funnel.bookings} hint={`${revenue.bookings_cancelled} annulée${revenue.bookings_cancelled > 1 ? 's' : ''}`} />
        <Kpi icon={Banknote} label="Chiffre d'affaires généré" value={fcfa(revenue.gross_amount)} hint={revenue.average_basket ? `panier moyen ${fcfa(revenue.average_basket)}` : undefined} />
        <Kpi icon={Gift} label="Remises de bienvenue accordées" value={fcfa(revenue.discounts_granted)} hint={`${revenue.discounts_count} réservation${revenue.discounts_count > 1 ? 's' : ''} · financées par boséjour`} />
        <Kpi icon={Star} label="Points gagnés" value={points.earned} hint={points.withdrawn ? `${points.withdrawn} retirés` : points.pending_account ? `${points.pending_account} en attente de son compte` : undefined} />
      </div>

      {/* Coordonnées + QR */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Compte et coordonnées">
          {data.user ? (
            <dl className="text-sm grid grid-cols-[8rem_1fr] gap-y-2">
              <dt className="text-gray-500">Nom</dt>
              <dd className="font-medium">{data.user.name} <Link href={`/dashboard/admin/users/${data.user.id}`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline ml-1">Voir le compte <ExternalLink className="w-3 h-3" /></Link></dd>
              <dt className="text-gray-500">E-mail</dt><dd>{data.user.email}</dd>
              <dt className="text-gray-500">Téléphone</dt><dd>{data.user.phone || '—'}</dd>
              <dt className="text-gray-500">Solde de points</dt><dd className="font-semibold">{points.balance ?? 0}{points.tier ? <span className="ml-2 text-xs font-normal text-gray-500">niveau {points.tier}</span> : null}</dd>
              {data.claimed_at && (data.invited_email || data.invited_phone) && (<><dt className="text-gray-500">Compte créé</dt><dd>le {day(data.claimed_at)} (désigné avant son inscription)</dd></>)}
            </dl>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="text-amber-800 dark:text-amber-300">
                Pas encore inscrit. Il retrouvera son QR code, son lien et ses points ({points.pending_account} déjà gagnés) dès qu&apos;un compte vérifié portera cet e-mail ou ce numéro.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block"><span className="block text-xs text-gray-500 mb-1">E-mail</span>
                  <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
                </label>
                <label className="block"><span className="block text-xs text-gray-500 mb-1">Numéro WhatsApp</span>
                  <input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
                </label>
              </div>
              <button disabled={saving} onClick={() => save({ invited_email: contact.email.trim() || null, invited_phone: contact.phone.trim() || null }, 'Coordonnées enregistrées')} className="btn-outline text-xs">Corriger les coordonnées</button>
            </div>
          )}
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <label className="block text-sm"><span className="block text-xs text-gray-500 mb-1">Nom affiché (restaurant, marque, influenceur…)</span>
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
                <button disabled={saving || name === (data.display_name ?? '')} onClick={() => save({ display_name: name.trim() || null }, 'Nom enregistré')} className="btn-outline text-xs disabled:opacity-50">Enregistrer</button>
              </div>
            </label>
          </div>
        </Section>

        <Section title="QR code et lien">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div ref={svgRef} className="rounded-xl bg-white p-3 border border-gray-200 shrink-0">
              <QRCodeSVG value={data.qr_link} size={150} level="M" marginSize={2} bgColor="#ffffff" fgColor="#0F0F0F" role="img" aria-label="QR code de l'ambassadeur" />
            </div>
            <div ref={pngRef} className="hidden" aria-hidden><QRCodeCanvas value={data.qr_link} size={1024} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000" /></div>
            <div className="min-w-0 flex-1 space-y-3 text-sm w-full">
              <div>
                <p className="text-xs text-gray-500 mb-1">Lien à partager (compté comme « clic »)</p>
                <div className="flex items-center gap-2">
                  <input readOnly value={data.link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-mono" />
                  <button onClick={() => copy(data.link)} className="text-gray-400 hover:text-primary" aria-label="Copier le lien"><Copy className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-xs text-gray-500">Le QR code encode le même lien avec la mention « scan » : c&apos;est ce qui permet de distinguer les scans des clics.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { const c = pngRef.current?.querySelector('canvas'); if (c) download(c.toDataURL('image/png'), `bosejour-qr-${data.code}.png`); }} className="btn-primary text-xs inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> QR code PNG</button>
                <button onClick={downloadSvg} className="btn-outline text-xs inline-flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> QR code SVG</button>
              </div>
            </div>
          </div>
        </Section>
      </div>

      {/* Évolution */}
      <Section
        title="Évolution de l'activité"
        action={
          <div className="flex gap-1.5" role="group" aria-label="Période">
            {[7, 30, 90].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={`px-3 py-1 rounded-full text-xs font-medium ${days === d ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                {d} jours
              </button>
            ))}
          </div>
        }
      >
        <p className="text-xs text-gray-500">
          Aujourd&apos;hui {visits.today} · 7 derniers jours {visits.last_7_days} · 30 derniers jours {visits.last_30_days} visites. Première visite : {dateTime(visits.first_at)} · dernière : {dateTime(visits.last_at)}.
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={report.timeline.series} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tickFormatter={(d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} tick={{ fontSize: 11 }} minTickGap={24} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip labelFormatter={(d) => new Date(String(d)).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="visits" name="Visites" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="signups" name="Inscriptions" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="bookings" name="1res réservations" stroke="#16a34a" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Entonnoir */}
      <Section title="Parcours des clients amenés">
        <div className="space-y-3">
          {funnelSteps.map((s) => (
            <div key={s.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 dark:text-gray-300">{s.label}</span>
                <span className="tabular-nums"><strong>{s.value}</strong>{s.rate !== null && <span className="text-xs text-gray-500 ml-2">{pct(s.rate)} de l&apos;étape précédente</span>}</span>
              </div>
              <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden"><div className="h-full rounded-full bg-primary" style={{ width: `${(s.value / top) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">Du premier passage à la réservation confirmée : {pct(funnel.rate_global)} des visiteurs uniques.</p>
      </Section>

      {/* Filleuls */}
      <Section
        title={`Clients amenés (${report.referrals.length})`}
        action={
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher un client" className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs w-44" />
            </div>
            <button onClick={exportReferrals} disabled={report.referrals.length === 0} className="btn-outline text-xs inline-flex items-center gap-1.5 disabled:opacity-50"><Download className="w-3.5 h-3.5" /> CSV</button>
          </div>
        }
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">{report.referrals.length === 0 ? "Personne ne s'est encore inscrit avec cette invitation." : 'Aucun résultat.'}</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500 border-b border-gray-100 dark:border-gray-700">
                <tr><th className="p-2">Client</th><th className="p-2">Inscription</th><th className="p-2">1re réservation</th><th className="p-2 text-right">Points</th><th className="p-2">Remise 5 %</th></tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 align-top">
                    <td className="p-2">
                      <p className="font-medium">{r.user ? <Link href={`/dashboard/admin/users/${r.user.id}`} className="hover:text-primary hover:underline">{r.user.name}</Link> : 'Compte supprimé'}</p>
                      <p className="text-xs text-gray-500">{r.user?.email}{r.user?.phone ? ` · ${r.user.phone}` : ''}</p>
                    </td>
                    <td className="p-2 text-xs">
                      <p>Inscrit le {day(r.registered_at)}</p>
                      <p className={r.validated_at ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}>{r.validated_at ? `Validé le ${day(r.validated_at)}` : 'Non validé'}</p>
                    </td>
                    <td className="p-2 text-xs">
                      {r.first_booking ? (
                        <>
                          <p className="font-medium">{r.first_booking.accommodation ?? 'Établissement'} <span className="text-gray-400">{r.first_booking.number}</span></p>
                          <p>{fcfa(r.first_booking.total_price)} <span className={`ml-1 px-1.5 py-0.5 rounded-full ${BOOKING_STYLE[r.first_booking.status] ?? 'bg-gray-100 text-gray-600'}`}>{r.first_booking.status_label}</span></p>
                        </>
                      ) : (
                        <span className="text-gray-400">{r.bookings_count > 0 ? `${r.bookings_count} réservation(s) en attente de confirmation` : 'Pas encore de réservation'}</span>
                      )}
                    </td>
                    <td className="p-2 text-right text-xs tabular-nums">
                      <p>{r.signup_points > 0 ? `+${r.signup_points}` : '0'} <span className="text-gray-400">inscription{r.signup_points > 0 && !r.signup_credited ? ' (en attente)' : ''}</span></p>
                      <p>{r.booking_points > 0 ? `+${r.booking_points}` : '0'} <span className="text-gray-400">réservation{r.booking_points > 0 && !r.booking_credited ? ' (en attente)' : ''}</span></p>
                    </td>
                    <td className="p-2 text-xs">
                      <span className={`px-2 py-0.5 rounded-full ${DISCOUNT_STYLE[r.discount_state]}`}>{DISCOUNT_LABEL[r.discount_state]}</span>
                      {r.discount_amount ? <p className="mt-1 text-gray-500">−{fcfa(r.discount_amount)}</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Réservations générées */}
      <Section title={`Réservations de ses clients (${report.bookings.length})`}>
        {report.bookings.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune réservation pour le moment.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-gray-500 border-b border-gray-100 dark:border-gray-700">
                <tr><th className="p-2">Réservation</th><th className="p-2">Séjour</th><th className="p-2">Statut</th><th className="p-2 text-right">Montant</th><th className="p-2 text-right">Remise 5 %</th></tr>
              </thead>
              <tbody>
                {report.bookings.map((b) => (
                  <tr key={b.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <td className="p-2"><Link href={`/dashboard/admin/reservations/${b.id}`} className="font-medium hover:text-primary hover:underline">{b.number ?? `#${b.id}`}</Link><p className="text-xs text-gray-500">{b.accommodation}{b.city ? ` · ${b.city}` : ''}</p></td>
                    <td className="p-2 text-xs">{day(b.check_in)} → {day(b.check_out)}</td>
                    <td className="p-2"><span className={`text-xs px-2 py-0.5 rounded-full ${BOOKING_STYLE[b.status] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>{b.status_label}</span></td>
                    <td className="p-2 text-right tabular-nums">{fcfa(b.total_price)}</td>
                    <td className="p-2 text-right tabular-nums text-xs">{b.discount_amount > 0 ? `−${fcfa(b.discount_amount)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Points */}
        <Section title="Mouvements de points">
          <p className="text-xs text-gray-500">
            Gagnés {points.earned} · retirés {points.withdrawn}{points.balance !== null ? ` · solde actuel ${points.balance}` : ''}
            {points.pending_account > 0 ? ` · ${points.pending_account} en attente de la création de son compte` : ''}. Les points ne sont jamais convertis en argent : ils donnent des bons de réduction sur des séjours.
          </p>
          {report.ledger.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun mouvement.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
              {report.ledger.map((l) => (
                <li key={l.id} className="py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0"><p>{l.label}</p><p className="text-xs text-gray-500 truncate">{l.description} · {dateTime(l.at)}</p></div>
                  <span className={`font-semibold tabular-nums ${l.points > 0 ? 'text-green-600' : 'text-red-600'}`}>{l.points > 0 ? '+' : ''}{l.points}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Journal */}
        <Section title="Journal d'activité">
          <ol className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {report.events.map((e, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${EVENT_DOT[e.type] ?? 'bg-gray-400'}`} aria-hidden />
                <div><p>{e.label}</p><p className="text-xs text-gray-400">{dateTime(e.at)}</p></div>
              </li>
            ))}
          </ol>
        </Section>
      </div>

      {/* Notes internes */}
      <Section title="Notes internes (visibles des administrateurs uniquement)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 5000))}
          rows={4}
          placeholder="Contexte, accords passés, rappels…"
          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y"
        />
        <button disabled={saving || notes === (data.notes ?? '')} onClick={() => save({ notes: notes.trim() || null }, 'Notes enregistrées')} className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50">
          <Save className="w-4 h-4" /> Enregistrer les notes
        </button>
      </Section>

      <p className="text-xs text-gray-400 flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> Les clics comptent un visiteur une fois par jour ; les visites d&apos;avant la mise en place des scans n&apos;ont pas d&apos;origine distinguée.</p>
    </div>
  );
}
