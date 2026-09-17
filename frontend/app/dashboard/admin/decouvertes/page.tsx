'use client';

import { useEffect, useState } from 'react';
import { Compass, Waves, Landmark, Eye, UtensilsCrossed, Moon, Plus, Pencil, Trash2, X, Check, Loader2, ImagePlus, Briefcase, Palmtree, Video, Star } from 'lucide-react';
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

interface TrendingDestination {
  id: number;
  city: string;
  from_price: number;
  accommodations_count: number;
  categories: SiteCategory[] | null;
  image_path: string;
  display_order: number;
  is_published: boolean;
}

interface ShowcaseVideo {
  id: number;
  label: string;
  rating: number;
  image_path: string;
  video_url: string | null;
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
/* Destinations tendances                                              */
/* ------------------------------------------------------------------ */

function DestinationsTab() {
  const { showError, showSuccess } = useToast();
  const confirmAction = useConfirm();
  const [destinations, setDestinations] = useState<TrendingDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<null | 'new' | number>(null);
  const [city, setCity] = useState('');
  const [fromPrice, setFromPrice] = useState('');
  const [accommodationsCount, setAccommodationsCount] = useState('');
  const [categories, setCategories] = useState<SiteCategory[]>([]);
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isPublished, setIsPublished] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/admin/discovery/destinations').then((r) => setDestinations(r.data?.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setShowForm(null);
    setCity('');
    setFromPrice('');
    setAccommodationsCount('');
    setCategories([]);
    setDisplayOrder('0');
    setIsPublished(false);
    setImageFile(null);
  };

  const openEdit = (d: TrendingDestination) => {
    setShowForm(d.id);
    setCity(d.city);
    setFromPrice(String(d.from_price));
    setAccommodationsCount(String(d.accommodations_count));
    setCategories(d.categories || []);
    setDisplayOrder(String(d.display_order));
    setIsPublished(d.is_published);
    setImageFile(null);
  };

  const toggleCategory = (c: SiteCategory) => {
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const save = async () => {
    if (!city.trim()) { showError('La ville est requise.'); return; }
    if (!fromPrice.trim()) { showError('Le prix de départ est requis.'); return; }
    if (!accommodationsCount.trim()) { showError("Le nombre d'hébergements est requis."); return; }
    if (showForm === 'new' && !imageFile) { showError('Une photo est requise.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('city', city.trim());
      fd.append('from_price', fromPrice);
      fd.append('accommodations_count', accommodationsCount);
      categories.forEach((c) => fd.append('categories[]', c));
      fd.append('display_order', displayOrder || '0');
      fd.append('is_published', isPublished ? '1' : '0');
      if (imageFile) fd.append('image', imageFile);

      if (showForm === 'new') {
        await api.post('/admin/discovery/destinations', fd);
        showSuccess('Destination ajoutée.');
      } else if (typeof showForm === 'number') {
        await api.post(`/admin/discovery/destinations/${showForm}`, fd);
        showSuccess('Destination mise à jour.');
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
    const ok = await confirmAction({ title: 'Supprimer cette destination ?', message: 'Cette action est irréversible.', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/admin/discovery/destinations/${id}`);
      showSuccess('Destination supprimée.');
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
          Affichées sur l&apos;accueil dans &laquo;&nbsp;Destinations tendances&nbsp;&raquo; — uniquement les entrées publiées, filtrables par catégorie.
        </p>
        {showForm === null && (
          <button onClick={() => setShowForm('new')} className="btn-primary text-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Ajouter une destination
          </button>
        )}
      </div>

      {showForm !== null && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ville (ex : Yamoussoukro)"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            <input type="number" min={0} value={fromPrice} onChange={(e) => setFromPrice(e.target.value)} placeholder="À partir de (fcfa/nuit)"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            <input type="number" min={0} value={accommodationsCount} onChange={(e) => setAccommodationsCount(e.target.value)} placeholder="Nombre d'hébergements"
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

      {destinations.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Aucune destination pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {destinations.map((d) => (
            <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex-wrap">
              <ImageThumb path={d.image_path} alt={d.city} />
              <div className="flex-1 min-w-[160px]">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{d.city}</p>
                <p className="text-xs text-gray-500">
                  À partir de {d.from_price.toLocaleString('fr-FR')} fcfa/nuit · {d.accommodations_count} hébergement{d.accommodations_count > 1 ? 's' : ''} · ordre {d.display_order}
                  {(d.categories || []).length > 0 && (
                    <> · {(d.categories || []).map((c) => SITE_CATEGORY_OPTIONS.find((o) => o.value === c)?.label).filter(Boolean).join(', ')}</>
                  )}
                </p>
              </div>
              <PublishBadge published={d.is_published} />
              <button onClick={() => openEdit(d)} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5" title="Modifier">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(d.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="Supprimer">
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
/* Vidéos ("Explorer boséjour")                                        */
/* ------------------------------------------------------------------ */

function ShowcaseTextEditor() {
  const { showError, showSuccess } = useToast();
  const confirmAction = useConfirm();
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.get('/admin/discovery/showcase-text')
      .then((r) => { setTitle(r.data?.title ?? ''); setDescription(r.data?.description ?? ''); setImagePath(r.data?.image_path ?? null); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!title.trim() || !description.trim()) { showError('Le titre et la description sont requis.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('description', description.trim());
      if (imageFile) fd.append('image', imageFile);
      await api.post('/admin/discovery/showcase-text', fd);
      showSuccess('Texte mis à jour.');
      setImageFile(null);
      load();
    } catch (err: any) {
      showError(err.response?.data?.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const resetImage = async () => {
    const ok = await confirmAction({ title: 'Revenir à la photo automatique ?', message: "L'image personnalisée sera retirée — le bloc reprendra une photo d'hébergement réelle par défaut.", variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete('/admin/discovery/showcase-text/image');
      showSuccess('Image réinitialisée.');
      setImagePath(null);
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la réinitialisation.');
    }
  };

  if (loading) return <div className="py-6"><LoadingSpinner /></div>;

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-3 mb-4">
      <p className="text-xs text-gray-500">Texte et photo du grand bloc, à gauche des vidéos, sur l&apos;accueil.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre (ex : Vivez l'expérience)"
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description"
          className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {imagePath && <ImageThumb path={imagePath} alt="Photo du bloc" />}
        <label className="btn-outline text-sm inline-flex items-center gap-2 cursor-pointer">
          <ImagePlus className="w-4 h-4" /> {imageFile ? imageFile.name : imagePath ? 'Remplacer la photo' : 'Choisir une photo (optionnel)'}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </label>
        {imagePath && !imageFile && (
          <button onClick={resetImage} type="button" className="text-xs text-red-500 hover:underline">Revenir à la photo automatique</button>
        )}
      </div>
      <p className="text-xs text-gray-400">Sans photo choisie ici, le bloc affiche automatiquement une vraie photo d&apos;hébergement.</p>
      <button onClick={save} disabled={saving} className="btn-primary text-sm inline-flex items-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Enregistrer
      </button>
    </div>
  );
}

function VideosTab() {
  const { showError, showSuccess } = useToast();
  const confirmAction = useConfirm();
  const [videos, setVideos] = useState<ShowcaseVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<null | 'new' | number>(null);
  const [label, setLabel] = useState('');
  const [rating, setRating] = useState('5');
  const [videoUrl, setVideoUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState('0');
  const [isPublished, setIsPublished] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/admin/discovery/videos').then((r) => setVideos(r.data?.data ?? [])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setShowForm(null);
    setLabel('');
    setRating('5');
    setVideoUrl('');
    setDisplayOrder('0');
    setIsPublished(false);
    setImageFile(null);
  };

  const openEdit = (v: ShowcaseVideo) => {
    setShowForm(v.id);
    setLabel(v.label);
    setRating(String(v.rating));
    setVideoUrl(v.video_url || '');
    setDisplayOrder(String(v.display_order));
    setIsPublished(v.is_published);
    setImageFile(null);
  };

  const save = async () => {
    if (!label.trim()) { showError('Le nom du lieu est requis.'); return; }
    if (showForm === 'new' && !imageFile) { showError('Une vignette est requise.'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('label', label.trim());
      fd.append('rating', rating || '5');
      fd.append('video_url', videoUrl.trim());
      fd.append('display_order', displayOrder || '0');
      fd.append('is_published', isPublished ? '1' : '0');
      if (imageFile) fd.append('image', imageFile);

      if (showForm === 'new') {
        await api.post('/admin/discovery/videos', fd);
        showSuccess('Vidéo ajoutée.');
      } else if (typeof showForm === 'number') {
        await api.post(`/admin/discovery/videos/${showForm}`, fd);
        showSuccess('Vidéo mise à jour.');
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
    const ok = await confirmAction({ title: 'Supprimer cette vidéo ?', message: 'Cette action est irréversible.', variant: 'danger' });
    if (!ok) return;
    try {
      await api.delete(`/admin/discovery/videos/${id}`);
      showSuccess('Vidéo supprimée.');
      load();
    } catch (err: any) {
      showError(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  return (
    <div className="space-y-4">
      <ShowcaseTextEditor />

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Affichées sur l&apos;accueil dans &laquo;&nbsp;Explorer boséjour&nbsp;&raquo; — uniquement les entrées publiées.
        </p>
        {showForm === null && (
          <button onClick={() => setShowForm('new')} className="btn-primary text-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Ajouter une vidéo
          </button>
        )}
      </div>

      {showForm !== null && (
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Lieu (ex : Assinie, Côte d'Ivoire)"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
            <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Lien de la vidéo (YouTube, Vimeo…, optionnel)"
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="btn-outline text-sm inline-flex items-center gap-2 cursor-pointer">
              <ImagePlus className="w-4 h-4" /> {imageFile ? imageFile.name : 'Choisir une vignette'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              Note
              <select value={rating} onChange={(e) => setRating(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm">
                {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
              </select>
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

      {loading ? (
        <div className="py-12"><LoadingSpinner /></div>
      ) : videos.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Aucune vidéo pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {videos.map((v) => (
            <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-gray-700 flex-wrap">
              <ImageThumb path={v.image_path} alt={v.label} />
              <div className="flex-1 min-w-[160px]">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{v.label}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3 h-3 ${i < v.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                  ))}
                  <span className="ml-1">· ordre {v.display_order}{v.video_url ? ' · lien vidéo' : ''}</span>
                </p>
              </div>
              <PublishBadge published={v.is_published} />
              <button onClick={() => openEdit(v)} className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5" title="Modifier">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => remove(v.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" title="Supprimer">
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
  const [tab, setTab] = useState<'sites' | 'activities' | 'destinations' | 'videos'>('sites');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" /> Découvertes
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Contenu éditorial de l&apos;accueil (sites à voir, activités, destinations tendances, vidéos) — tant qu&apos;aucune entrée n&apos;est publiée
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
        <button onClick={() => setTab('destinations')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'destinations' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          Destinations tendances
        </button>
        <button onClick={() => setTab('videos')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === 'videos' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          Vidéos
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        {tab === 'sites' ? <SitesTab /> : tab === 'activities' ? <ActivitiesTab /> : tab === 'destinations' ? <DestinationsTab /> : <VideosTab />}
      </div>
    </div>
  );
}
