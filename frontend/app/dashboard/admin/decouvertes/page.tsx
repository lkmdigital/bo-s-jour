'use client';

import { useEffect, useState } from 'react';
import { Compass, Waves, Landmark, Eye, UtensilsCrossed, Moon, Plus, Pencil, Trash2, X, Check, Loader2, ImagePlus, Briefcase, Palmtree } from 'lucide-react';
import api from '@/lib/api';
import { useToast } from '@/components/common/ToastContext';
import { useConfirm } from '@/components/common/ConfirmContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { resolveImageUrl } from '@/lib/utils';

/**
 * Retour client 2026-09-15 : « Principaux sites à voir » et « Meilleures
 * activités à Abidjan » sur l'accueil étaient du contenu inventé (photos
 * Unsplash, lieux codés en dur) — masqués côté public tant que rien n'est
 * publié ici (voir components/home/sections.tsx). Le client veut du vrai
 * contenu, géré par l'admin : cette page pilote les deux.
 */

type ActivityCategory = 'plage' | 'musee' | 'voir' | 'nourriture' | 'vie_nocturne';

const CATEGORY_OPTIONS: { value: ActivityCategory; label: string; icon: typeof Compass }[] = [
  { value: 'plage', label: 'Plage', icon: Waves },
  { value: 'musee', label: 'Musée', icon: Landmark },
  { value: 'voir', label: 'À voir', icon: Eye },
  { value: 'nourriture', label: 'Nourriture', icon: UtensilsCrossed },
  { value: 'vie_nocturne', label: 'Vie nocturne', icon: Moon },
];

// Retour client 2026-09-16 (correction "Les destinations tendances") :
// catégories de voyage pour "Principaux sites à voir" — distinctes des
// onglets d'activités ci-dessus, un site peut appartenir à plusieurs.
type SiteCategory = 'business' | 'balneaire' | 'tourisme_culture' | 'escapade_weekend';

const SITE_CATEGORY_OPTIONS: { value: SiteCategory; label: string; icon: typeof Compass }[] = [
  { value: 'business', label: 'Business', icon: Briefcase },
  { value: 'balneaire', label: 'Balnéaires', icon: Waves },
  { value: 'tourisme_culture', label: 'Tourisme et culture', icon: Landmark },
  { value: 'escapade_weekend', label: 'Escapade weekend', icon: Palmtree },
];

interface DiscoverySite {
  id: number;
  name: string;
  city: string | null;
  categories: SiteCategory[] | null;
  image_path: string;
  display_order: number;
  is_published: boolean;
}

interface DiscoveryActivity {
  id: number;
  name: string;
  categories: ActivityCategory[] | null;
  search_term: string | null;
  image_path: string;
  display_order: number;
  is_published: boolean;
}

function ImageThumb({ path, alt }: { path: string; alt: string }) {
  const url = resolveImageUrl(path);
  return (
    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
      {url && <img src={url} alt={alt} className="w-full h-full object-cover" />}
    </div>
  );
}

function PublishBadge({ published }: { published: boolean }) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
      published
        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
    }`}>
      {published ? 'Publié' : 'Brouillon'}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Sites à voir                                                        */
/* ------------------------------------------------------------------ */

function SitesTab() {
  const { showError, showSuccess } = useToast();
  const confirmAction = useConfirm();
  const [sites, setSites] = useState<DiscoverySite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<null | 'new' | number>(null);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [categories, setCategories] = useState<SiteCategory[]>([]);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isPublished, setIsPublished] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/admin/discovery/sites').then((r) => setSites(r.data?.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setShowForm(null);
    setName('');
    setCity('');
    setCategories([]);
    setDisplayOrder('0');
    setIsPublished(false);
    setImageFile(null);
  };

  const openEdit = (s: DiscoverySite) => {
    setShowForm(s.id);
    setName(s.name);
    setCity(s.city || '');
    setCategories(s.categories || []);
    setDisplayOrder(String(s.display_order));
    setIsPublished(s.is_published);
    setImageFile(null);
  };

  const toggleCategory = (c: SiteCategory) => {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const save = async () => {
    if (!name.trim()) { showError('Le nom est requis.'); return; }
    if (showForm === 'new' && !imageFile) { showError('Une photo est requise.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('city', city.trim());
      categories.forEach((c) => fd.append('categories[]', c));
      fd.append('display_order', displayOrder || '0');
      fd.append('is_published', isPublished ? '1' : '0');
      if (imageFile) fd.append('image', imageFile);

      if (showForm === 'new') {
        await api.post('/admin/discovery/sites', fd);
        showSuccess('Site ajouté.');
      } else if (typeof showForm === 'number') {
        await api.post(`/admin/discovery/sites/${showForm}`, fd);
        showSuccess('Site mis à jour.');
      }
      resetForm();
      load();
    } catch (err: any) {
      showError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmAction({ title: 'Supprimer ce site ?', message: 'Cette action est irréversible.', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/admin/discovery/sites/${id}`);
      showSuccess('Site supprimé.');
      load();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  if (loading) return <div className="py-12"><LoadingSpinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Affichés sur l&apos;accueil dans &laquo;&nbsp;Principaux sites à voir&nbsp;&raquo; — uniquement les entrées publiées.
        </p>
        {showForm === null && (
          <button onClick={() => setShowForm('new')} className="btn-primary text-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Ajouter un site
          </button>
        )}
      </div>

      {showForm !== null && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom du lieu (ex : Grand-Bassam)"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville / région (optionnel)"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Catégories (onglets de filtre)</p>
            <div className="flex flex-wrap gap-2">
              {SITE_CATEGORY_OPTIONS.map((c) => {
                const Icon = c.icon;
                const isActive = categories.includes(c.value);
                return (
                  <button key={c.value} type="button" onClick={() => toggleCategory(c.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      isActive ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                    }`}>
                    <Icon className="w-3.5 h-3.5" /> {c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-outline text-sm inline-flex items-center gap-2 cursor-pointer">
              <ImagePlus className="w-4 h-4" /> {imageFile ? imageFile.name : 'Choisir une photo'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              Ordre
              <input type="number" min={0} value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-20 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="rounded" />
              Publié (visible sur l&apos;accueil)
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enregistrer
            </button>
            <button onClick={resetForm} className="btn-secondary text-sm">Annuler</button>
          </div>
        </div>
      )}

      {sites.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Aucun site pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {sites.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex-wrap">
              <ImageThumb path={s.image_path} alt={s.name} />
              <div className="flex-1 min-w-[160px]">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                <p className="text-xs text-gray-500">
                  {s.city || '—'} · ordre {s.display_order}
                  {(s.categories || []).length > 0 && (
                    <> · {(s.categories || []).map((c) => SITE_CATEGORY_OPTIONS.find((o) => o.value === c)?.label).filter(Boolean).join(', ')}</>
                  )}
                </p>
              </div>
              <PublishBadge published={s.is_published} />
              <button onClick={() => openEdit(s)} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5" title="Modifier">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(s.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="Supprimer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Activités                                                           */
/* ------------------------------------------------------------------ */

function ActivitiesTab() {
  const { showError, showSuccess } = useToast();
  const confirmAction = useConfirm();
  const [activities, setActivities] = useState<DiscoveryActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<null | 'new' | number>(null);
  const [name, setName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isPublished, setIsPublished] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/admin/discovery/activities').then((r) => setActivities(r.data?.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setShowForm(null);
    setName('');
    setSearchTerm('');
    setCategories([]);
    setDisplayOrder('0');
    setIsPublished(false);
    setImageFile(null);
  };

  const openEdit = (a: DiscoveryActivity) => {
    setShowForm(a.id);
    setName(a.name);
    setSearchTerm(a.search_term || '');
    setCategories(a.categories || []);
    setDisplayOrder(String(a.display_order));
    setIsPublished(a.is_published);
    setImageFile(null);
  };

  const toggleCategory = (c: ActivityCategory) => {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const save = async () => {
    if (!name.trim()) { showError('Le nom est requis.'); return; }
    if (showForm === 'new' && !imageFile) { showError('Une photo est requise.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('search_term', searchTerm.trim() || name.trim());
      categories.forEach((c) => fd.append('categories[]', c));
      fd.append('display_order', displayOrder || '0');
      fd.append('is_published', isPublished ? '1' : '0');
      if (imageFile) fd.append('image', imageFile);

      if (showForm === 'new') {
        await api.post('/admin/discovery/activities', fd);
        showSuccess('Activité ajoutée.');
      } else if (typeof showForm === 'number') {
        await api.post(`/admin/discovery/activities/${showForm}`, fd);
        showSuccess('Activité mise à jour.');
      }
      resetForm();
      load();
    } catch (err: any) {
      showError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: number) => {
    const ok = await confirmAction({ title: 'Supprimer cette activité ?', message: 'Cette action est irréversible.', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/admin/discovery/activities/${id}`);
      showSuccess('Activité supprimée.');
      load();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  if (loading) return <div className="py-12"><LoadingSpinner /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Affichées sur l&apos;accueil dans &laquo;&nbsp;Meilleures activités à Abidjan&nbsp;&raquo; — uniquement les entrées publiées.
        </p>
        {showForm === null && (
          <button onClick={() => setShowForm('new')} className="btn-primary text-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Ajouter une activité
          </button>
        )}
      </div>

      {showForm !== null && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom (ex : Plage de Grand-Bassam)"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Terme de recherche lié (optionnel, sinon le nom)"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1.5">Catégories (onglets de filtre)</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((c) => {
                const Icon = c.icon;
                const isActive = categories.includes(c.value);
                return (
                  <button key={c.value} type="button" onClick={() => toggleCategory(c.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      isActive ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:border-black'
                    }`}>
                    <Icon className="w-3.5 h-3.5" /> {c.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-outline text-sm inline-flex items-center gap-2 cursor-pointer">
              <ImagePlus className="w-4 h-4" /> {imageFile ? imageFile.name : 'Choisir une photo'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              Ordre
              <input type="number" min={0} value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value)}
                className="w-20 px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="rounded" />
              Publié (visible sur l&apos;accueil)
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enregistrer
            </button>
            <button onClick={resetForm} className="btn-secondary text-sm">Annuler</button>
          </div>
        </div>
      )}

      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Aucune activité pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex-wrap">
              <ImageThumb path={a.image_path} alt={a.name} />
              <div className="flex-1 min-w-[160px]">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{a.name}</p>
                <p className="text-xs text-gray-500">
                  {(a.categories || []).map((c) => CATEGORY_OPTIONS.find((o) => o.value === c)?.label).filter(Boolean).join(', ') || 'Sans catégorie'}
                  {' · ordre '}{a.display_order}
                </p>
              </div>
              <PublishBadge published={a.is_published} />
              <button onClick={() => openEdit(a)} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5" title="Modifier">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(a.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="Supprimer">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function AdminDiscoveryPage() {
  const [tab, setTab] = useState<'sites' | 'activities'>('sites');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" /> Découvertes
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Contenu éditorial de l&apos;accueil (sites à voir, activités) — tant qu&apos;aucune entrée n&apos;est publiée
          dans une catégorie, la section correspondante reste masquée pour les visiteurs.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setTab('sites')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'sites' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          Sites à voir
        </button>
        <button onClick={() => setTab('activities')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'activities' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          Activités
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        {tab === 'sites' ? <SitesTab /> : <ActivitiesTab />}
      </div>
    </div>
  );
}
