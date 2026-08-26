'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { resolveImageUrl } from '@/lib/utils';
import { User as UserIcon, MapPin, Plane, Bell, Building2, Lock, Loader2, CheckCircle2, Eye, EyeOff, ShieldCheck, Upload, FileText, Camera, Trash2 } from 'lucide-react';

interface Profile {
  first_name?: string; last_name?: string; email?: string; phone?: string; whatsapp?: string;
  residence_country?: string; residence_city?: string; nationality?: string;
  traveler_type?: string;
  company_name?: string; company_vat?: string; company_address?: string; company_city?: string;
  company_country?: string; company_service?: string; company_project?: string; company_billing_email?: string;
  company_rccm?: string; company_tax_number?: string; company_unique_id?: string; company_sector?: string;
  date_of_birth?: string; gender?: string; profession?: string; preferred_language?: string;
  region?: string; commune?: string; address_line1?: string;
  preferred_accommodation_type?: string; average_budget?: number | string | null;
  interests?: string[]; travel_frequency?: string; travel_purpose?: string;
  notif_email?: boolean; notif_whatsapp?: boolean; notif_sms?: boolean; offer_types?: string[];
}

const GENDERS = [
  { key: '', label: 'Non précisé' }, { key: 'femme', label: 'Femme' },
  { key: 'homme', label: 'Homme' }, { key: 'autre', label: 'Autre' },
];
const LANGS = ['Français', 'English'];
const ACCOM_TYPES = ['Hôtel', 'Résidence', 'Villa', 'Auberge', 'Écolodge'];
const INTERESTS = ['Plage', 'Nature', 'Culture', 'Gastronomie', 'Sport', 'Affaires', 'Bien-être'];
const FREQUENCIES = ['Occasionnel', 'Régulier', 'Très fréquent'];
const PURPOSES = ['Tourisme', 'Affaires', 'Famille', 'Santé', 'Études', 'Événement', 'Autre'];
const OFFER_TYPES = ['Promotions', 'Offres exclusives', 'Nouveautés'];

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-400 mt-1">{hint}</span>}
    </label>
  );
}

function Card({ icon: Icon, title, subtitle, children, id }: { icon: any; title: string; subtitle?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 scroll-mt-24">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><Icon className="w-5 h-5" /></span>
        <div>
          <h2 className="font-bold">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Chips({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onToggle(o)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selected.includes(o) ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

export default function MemberProfilePage() {
  const router = useRouter();
  const t = useTranslations('member.pages.profile');
  const { isAuthenticated, isLoading, user, setUser } = useAuthStore();
  const [p, setP] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Photo de profil
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  // Mot de passe
  const [pwd, setPwd] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdErr, setPwdErr] = useState<string | null>(null);

  // Pièces d'identité
  const [idType, setIdType] = useState('CNI');
  const [idNumber, setIdNumber] = useState('');
  const [recto, setRecto] = useState<File | null>(null);
  const [verso, setVerso] = useState<File | null>(null);
  const [idStatus, setIdStatus] = useState<{ submitted: boolean; verified: boolean }>({ submitted: false, verified: false });
  const [idSaving, setIdSaving] = useState(false);
  const [idMsg, setIdMsg] = useState<string | null>(null);
  const [idErr, setIdErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/auth/login?redirect=/dashboard/user/profil');
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;
    api.get('/me')
      .then((r) => {
        const u = r.data?.user ?? r.data;
        setP({
          ...u,
          date_of_birth: u.date_of_birth ? String(u.date_of_birth).slice(0, 10) : '',
          interests: Array.isArray(u.interests) ? u.interests : [],
          offer_types: Array.isArray(u.offer_types) ? u.offer_types : [],
        });
        if (u.id_type) setIdType(u.id_type);
        if (u.id_number) setIdNumber(u.id_number);
        setIdStatus({ submitted: !!u.id_document_recto_path, verified: !!u.profile_verified });
      })
      .catch(() => setError('Impossible de charger votre profil.'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, isLoading]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));
  const toggleArr = (k: 'interests' | 'offer_types', v: string) =>
    setP((s) => {
      const arr = s[k] ?? [];
      return { ...s, [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] };
    });

  const isCorporate = p.traveler_type === 'corporate';

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null); setSavedMsg(null);
    try {
      const payload: Record<string, unknown> = {
        first_name: p.first_name, last_name: p.last_name, phone: p.phone, whatsapp: p.whatsapp,
        residence_country: p.residence_country, residence_city: p.residence_city, nationality: p.nationality,
        date_of_birth: p.date_of_birth || null, gender: p.gender || null, profession: p.profession,
        preferred_language: p.preferred_language, region: p.region, commune: p.commune, address_line1: p.address_line1,
        preferred_accommodation_type: p.preferred_accommodation_type,
        average_budget: p.average_budget ? Number(p.average_budget) : null,
        interests: p.interests, travel_frequency: p.travel_frequency, travel_purpose: p.travel_purpose,
        notif_email: !!p.notif_email, notif_whatsapp: !!p.notif_whatsapp, notif_sms: !!p.notif_sms,
        offer_types: p.offer_types,
      };
      if (isCorporate) {
        Object.assign(payload, {
          company_name: p.company_name, company_vat: p.company_vat, company_address: p.company_address,
          company_city: p.company_city, company_country: p.company_country, company_service: p.company_service,
          company_project: p.company_project, company_billing_email: p.company_billing_email || null,
          company_rccm: p.company_rccm, company_tax_number: p.company_tax_number,
          company_unique_id: p.company_unique_id, company_sector: p.company_sector,
        });
      }
      const res = await api.put('/me/profile', payload);
      const u = res.data?.user;
      if (u) {
        setUser(u);
        if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(u));
      }
      setSavedMsg('Profil enregistré ✓');
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdErr(null); setPwdMsg(null);
    if (pwd.password.length < 8) { setPwdErr('Le nouveau mot de passe doit contenir au moins 8 caractères.'); return; }
    if (pwd.password !== pwd.password_confirmation) { setPwdErr('Les mots de passe ne correspondent pas.'); return; }
    setPwdSaving(true);
    try {
      await api.post('/me/password', pwd);
      setPwdMsg('Mot de passe modifié ✓');
      setPwd({ current_password: '', password: '', password_confirmation: '' });
      setTimeout(() => setPwdMsg(null), 3000);
    } catch (err: any) {
      setPwdErr(err.response?.data?.errors?.current_password?.[0] || err.response?.data?.message || 'Échec de la modification.');
    } finally {
      setPwdSaving(false);
    }
  };

  const onAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAvatarErr(null);
    setAvatarSaving(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await api.post('/me/avatar', fd);
      if (res.data?.user) {
        setUser(res.data.user);
        if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    } catch (err: any) {
      setAvatarErr(err.response?.data?.errors?.avatar?.[0] || err.response?.data?.message || "Échec de l'envoi de la photo.");
    } finally {
      setAvatarSaving(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarErr(null);
    setAvatarSaving(true);
    try {
      await api.delete('/me/avatar');
      const updated = { ...(user as any), avatar: undefined };
      setUser(updated);
      if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(updated));
    } catch (err: any) {
      setAvatarErr(err.response?.data?.message || 'Échec de la suppression.');
    } finally {
      setAvatarSaving(false);
    }
  };

  const uploadIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdErr(null); setIdMsg(null);
    if (!idNumber.trim()) { setIdErr('Renseignez le numéro de la pièce.'); return; }
    if (!recto && !idStatus.submitted) { setIdErr('Ajoutez au moins le recto de la pièce.'); return; }
    if ((idType === 'CNI' || idType === 'Permis') && !verso && !idStatus.submitted) { setIdErr('Le verso est requis pour une CNI ou un permis.'); return; }
    setIdSaving(true);
    try {
      const fd = new FormData();
      fd.append('id_type', idType);
      fd.append('id_number', idNumber);
      if (recto) fd.append('id_document_recto', recto);
      if (verso) fd.append('id_document_verso', verso);
      await api.post('/me/identity', fd);
      setIdStatus({ submitted: true, verified: false });
      setRecto(null); setVerso(null);
      setIdMsg('Pièces enregistrées ✓ — en attente de vérification.');
      setTimeout(() => setIdMsg(null), 4000);
    } catch (err: any) {
      const errs = err.response?.data?.errors;
      setIdErr(errs ? Object.values(errs).flat()[0] as string : (err.response?.data?.message || "Échec de l'envoi."));
    } finally {
      setIdSaving(false);
    }
  };

  if (isLoading || (loading && isAuthenticated)) return <LoadingSpinner message="Chargement de votre profil…" size="lg" />;
  if (!isAuthenticated) return null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{t('subtitle')}</p>
      </div>

      {/* Photo de profil */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 flex items-center gap-5">
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-primary flex-shrink-0 flex items-center justify-center text-white text-xl font-bold">
          {user?.avatar ? (
            <Image src={resolveImageUrl(user.avatar) || user.avatar} alt={user?.name || 'Photo de profil'} fill className="object-cover" />
          ) : (
            (user?.name || 'BS').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('')
          )}
          {avatarSaving && (
            <span className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </span>
          )}
        </div>
        <div className="flex-1">
          <p className="font-semibold">Photo de profil</p>
          <p className="text-xs text-gray-500 mb-2">JPEG ou PNG, 2 Mo max.</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarSaving} className="btn-outline text-sm inline-flex items-center gap-2 disabled:opacity-50">
              <Camera className="w-4 h-4" /> {user?.avatar ? 'Changer' : 'Ajouter une photo'}
            </button>
            {user?.avatar && (
              <button type="button" onClick={removeAvatar} disabled={avatarSaving} className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50" title="Supprimer">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {avatarErr && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{avatarErr}</p>}
          <input ref={avatarInputRef} type="file" accept="image/jpeg,image/jpg,image/png" className="hidden" onChange={onAvatarSelected} />
        </div>
      </div>

      <form onSubmit={saveProfile} className="space-y-6">
        {/* Informations personnelles */}
        <Card icon={UserIcon} title="Informations personnelles">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Prénoms"><input className={inputCls} value={p.first_name || ''} onChange={(e) => set('first_name', e.target.value)} /></Field>
            <Field label="Nom"><input className={inputCls} value={p.last_name || ''} onChange={(e) => set('last_name', e.target.value)} /></Field>
            <Field label="E-mail" hint="Non modifiable ici"><input className={`${inputCls} opacity-60 cursor-not-allowed`} value={p.email || ''} disabled /></Field>
            <Field label="Téléphone"><input className={inputCls} value={p.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
            <Field label="WhatsApp"><input className={inputCls} value={p.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} /></Field>
            <Field label="Date de naissance"><input type="date" className={inputCls} value={p.date_of_birth || ''} onChange={(e) => set('date_of_birth', e.target.value)} /></Field>
            <Field label="Sexe">
              <select className={inputCls} value={p.gender || ''} onChange={(e) => set('gender', e.target.value)}>
                {GENDERS.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </Field>
            <Field label="Profession"><input className={inputCls} value={p.profession || ''} onChange={(e) => set('profession', e.target.value)} /></Field>
            <Field label="Langue préférée">
              <select className={inputCls} value={p.preferred_language || ''} onChange={(e) => set('preferred_language', e.target.value)}>
                <option value="">—</option>
                {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        {/* Localisation */}
        <Card icon={MapPin} title="Résidence & localisation" subtitle="Aide bo séjour à mieux vous connaître (statistiques touristiques)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Pays de résidence"><input className={inputCls} value={p.residence_country || ''} onChange={(e) => set('residence_country', e.target.value)} placeholder="Côte d'Ivoire" /></Field>
            <Field label="Ville de résidence"><input className={inputCls} value={p.residence_city || ''} onChange={(e) => set('residence_city', e.target.value)} placeholder="Abidjan" /></Field>
            <Field label="Nationalité"><input className={inputCls} value={p.nationality || ''} onChange={(e) => set('nationality', e.target.value)} /></Field>
            <Field label="Région"><input className={inputCls} value={p.region || ''} onChange={(e) => set('region', e.target.value)} /></Field>
            <Field label="Commune"><input className={inputCls} value={p.commune || ''} onChange={(e) => set('commune', e.target.value)} /></Field>
            <Field label="Adresse"><input className={inputCls} value={p.address_line1 || ''} onChange={(e) => set('address_line1', e.target.value)} /></Field>
          </div>
        </Card>

        {/* Préférences de voyage */}
        <Card icon={Plane} title="Préférences de voyage">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <Field label="Type d'hébergement préféré">
              <select className={inputCls} value={p.preferred_accommodation_type || ''} onChange={(e) => set('preferred_accommodation_type', e.target.value)}>
                <option value="">—</option>
                {ACCOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Budget moyen par nuitée (FCFA)"><input type="number" className={inputCls} value={p.average_budget ?? ''} onChange={(e) => set('average_budget', e.target.value)} /></Field>
            <Field label="Fréquence de voyage">
              <select className={inputCls} value={p.travel_frequency || ''} onChange={(e) => set('travel_frequency', e.target.value)}>
                <option value="">—</option>
                {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Motif principal du voyage">
              <select className={inputCls} value={p.travel_purpose || ''} onChange={(e) => set('travel_purpose', e.target.value)}>
                <option value="">—</option>
                {PURPOSES.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Centres d'intérêt"><Chips options={INTERESTS} selected={p.interests ?? []} onToggle={(v) => toggleArr('interests', v)} /></Field>
        </Card>

        {/* Communication */}
        <Card icon={Bell} title="Communication & notifications">
          <div className="space-y-3 mb-4">
            {[
              { k: 'notif_email' as const, label: 'Notifications par e-mail' },
              { k: 'notif_whatsapp' as const, label: 'Notifications par WhatsApp' },
              { k: 'notif_sms' as const, label: 'Notifications par SMS' },
            ].map((n) => (
              <label key={n.k} className="flex items-center justify-between text-sm">
                <span>{n.label}</span>
                <input type="checkbox" checked={!!p[n.k]} onChange={(e) => set(n.k, e.target.checked)} className="w-5 h-5 accent-[#FF0000]" />
              </label>
            ))}
          </div>
          <Field label="Type d'offres souhaitées"><Chips options={OFFER_TYPES} selected={p.offer_types ?? []} onToggle={(v) => toggleArr('offer_types', v)} /></Field>
        </Card>

        {/* Entreprise (corporate) */}
        {isCorporate && (
          <Card icon={Building2} title="Mon entreprise">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Nom de l'entreprise"><input className={inputCls} value={p.company_name || ''} onChange={(e) => set('company_name', e.target.value)} /></Field>
              <Field label="N° TVA"><input className={inputCls} value={p.company_vat || ''} onChange={(e) => set('company_vat', e.target.value)} /></Field>
              <Field label="RCCM"><input className={inputCls} value={p.company_rccm || ''} onChange={(e) => set('company_rccm', e.target.value)} /></Field>
              <Field label="Numéro de Compte Contribuable"><input className={inputCls} value={p.company_tax_number || ''} onChange={(e) => set('company_tax_number', e.target.value)} /></Field>
              <Field label="Identifiant Unique"><input className={inputCls} value={p.company_unique_id || ''} onChange={(e) => set('company_unique_id', e.target.value)} /></Field>
              <Field label="Secteur d'activité"><input className={inputCls} value={p.company_sector || ''} onChange={(e) => set('company_sector', e.target.value)} /></Field>
              <Field label="Adresse"><input className={inputCls} value={p.company_address || ''} onChange={(e) => set('company_address', e.target.value)} /></Field>
              <Field label="Ville"><input className={inputCls} value={p.company_city || ''} onChange={(e) => set('company_city', e.target.value)} /></Field>
              <Field label="Pays"><input className={inputCls} value={p.company_country || ''} onChange={(e) => set('company_country', e.target.value)} /></Field>
              <Field label="E-mail de facturation"><input type="email" className={inputCls} value={p.company_billing_email || ''} onChange={(e) => set('company_billing_email', e.target.value)} /></Field>
              <Field label="Service / Département"><input className={inputCls} value={p.company_service || ''} onChange={(e) => set('company_service', e.target.value)} /></Field>
              <Field label="Code projet"><input className={inputCls} value={p.company_project || ''} onChange={(e) => set('company_project', e.target.value)} /></Field>
            </div>
          </Card>
        )}

        {error && <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">{error}</div>}

        <div className="flex items-center gap-3 sticky bottom-4">
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50 inline-flex items-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : 'Enregistrer mon profil'}
          </button>
          {savedMsg && <span className="text-sm text-green-600 dark:text-green-400 inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {savedMsg}</span>}
        </div>
      </form>

      {/* Pièces d'identité */}
      <Card icon={ShieldCheck} title="Pièces d'identité" subtitle="Confidentielles — servent à vérifier votre identité">
        {idStatus.submitted && (
          <div className={`mb-5 rounded-xl p-3 text-sm flex items-center gap-2 ${idStatus.verified ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'}`}>
            {idStatus.verified ? <CheckCircle2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {idStatus.verified ? 'Pièce vérifiée.' : 'Pièce enregistrée — en attente de vérification. Vous pouvez la remplacer ci-dessous.'}
          </div>
        )}
        <form onSubmit={uploadIdentity} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Type de pièce">
              <select className={inputCls} value={idType} onChange={(e) => setIdType(e.target.value)}>
                <option value="CNI">Carte nationale d'identité (CNI)</option>
                <option value="Passeport">Passeport</option>
                <option value="Permis">Permis de conduire</option>
              </select>
            </Field>
            <Field label="Numéro de la pièce">
              <input className={inputCls} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Recto" hint="JPEG ou PNG, 5 Mo max">
              <input type="file" accept="image/jpeg,image/jpg,image/png" onChange={(e) => setRecto(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary/10 file:text-primary file:font-medium hover:file:bg-primary/20" />
            </Field>
            {(idType === 'CNI' || idType === 'Permis') && (
              <Field label="Verso" hint="JPEG ou PNG, 5 Mo max">
                <input type="file" accept="image/jpeg,image/jpg,image/png" onChange={(e) => setVerso(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary/10 file:text-primary file:font-medium hover:file:bg-primary/20" />
              </Field>
            )}
          </div>
          {idErr && <p className="text-sm text-red-600 dark:text-red-400">{idErr}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={idSaving} className="btn-outline disabled:opacity-50 inline-flex items-center gap-2 text-sm">
              {idSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</> : <><Upload className="w-4 h-4" /> {idStatus.submitted ? 'Remplacer la pièce' : 'Envoyer ma pièce'}</>}
            </button>
            {idMsg && <span className="text-sm text-green-600 dark:text-green-400 inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {idMsg}</span>}
          </div>
        </form>
      </Card>

      {/* Sécurité */}
      <Card id="securite" icon={Lock} title="Sécurité" subtitle="Changer votre mot de passe">
        <form onSubmit={changePassword} className="space-y-4">
          <Field label="Mot de passe actuel">
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} className={inputCls} value={pwd.current_password} onChange={(e) => setPwd((s) => ({ ...s, current_password: e.target.value }))} required />
              <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nouveau mot de passe" hint="8 caractères minimum"><input type={showPwd ? 'text' : 'password'} className={inputCls} value={pwd.password} onChange={(e) => setPwd((s) => ({ ...s, password: e.target.value }))} required /></Field>
            <Field label="Confirmer"><input type={showPwd ? 'text' : 'password'} className={inputCls} value={pwd.password_confirmation} onChange={(e) => setPwd((s) => ({ ...s, password_confirmation: e.target.value }))} required /></Field>
          </div>
          {pwdErr && <p className="text-sm text-red-600 dark:text-red-400">{pwdErr}</p>}
          <div className="flex items-center gap-3">
            <button type="submit" disabled={pwdSaving} className="btn-outline disabled:opacity-50 inline-flex items-center gap-2 text-sm">
              {pwdSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> …</> : 'Changer le mot de passe'}
            </button>
            {pwdMsg && <span className="text-sm text-green-600 dark:text-green-400 inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {pwdMsg}</span>}
          </div>
        </form>
      </Card>
    </div>
  );
}
