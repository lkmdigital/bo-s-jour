/**
 * Concatène des classes conditionnelles (utilitaire léger type clsx).
 * Ex: cn('base', isActive && 'active', error ? 'text-red' : undefined)
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Libellés FR pour la catégorie de chambre — centralisés ici (avant dupliqués et
 * incohérents entre RoomsList.tsx "Single/Twin" et dashboard/host/page.tsx "Simple/Jumelle").
 *
 * ⚠️ Couvre les valeurs de `room.type` (ROOM_TYPES dans le formulaire de création de
 * chambre), PAS seulement `room.room_category` — ce dernier existe en base mais n'est
 * rempli par AUCUN formulaire côté hôte, donc systématiquement vide en pratique. Toujours
 * appeler avec `getRoomCategoryLabel(room.room_category || room.type)` pour afficher la
 * vraie catégorie saisie par l'hôte. Découvert le 2026-09-02 (retour hôte + client : la
 * catégorie de chambre n'apparaissait nulle part, confirmation comme tableau de bord).
 */
export const ROOM_CATEGORY_LABELS: Record<string, string> = {
  single: 'Simple',
  double: 'Double',
  twin: 'Jumelle (2 lits)',
  triple: 'Triple',
  suite: 'Suite',
  suite_junior: 'Suite Junior',
  suite_familiale: 'Suite Familiale',
  studio: 'Studio',
  apartment: 'Appartement',
  bungalow: 'Bungalow',
  villa: 'Villa',
  pmr: 'PMR (accessibilité)',
  other: 'Autre',
  autre: 'Autre',
};

export function getRoomCategoryLabel(category?: string | null): string {
  if (!category) return '';
  return ROOM_CATEGORY_LABELS[category] || category;
}

/**
 * Formate une Date en "YYYY-MM-DD" à partir de ses composants en heure LOCALE.
 *
 * ⚠️ À utiliser à la place de `date.toISOString().split('T')[0]` partout où la date
 * vient d'un calendrier/date-picker (minuit heure locale) : toISOString() convertit
 * d'abord en UTC, ce qui fait basculer la date d'un jour en arrière pour tout visiteur
 * dans un fuseau horaire en avance sur UTC (Europe, la majeure partie de l'Afrique dont
 * le Nigeria/Cameroun voisins UTC+1, etc. — la Côte d'Ivoire est en UTC+0 donc épargnée,
 * mais pas les voyageurs internationaux). Bug réel trouvé en prod le 2026-09-01 : un
 * check-in "aujourd'hui" sélectionné dans le calendrier se faisait rejeter par la
 * validation backend (after_or_equal:today) car déjà "hier" une fois converti en UTC.
 */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normalise une URL d'image renvoyée par l'API.
 * - En dev via tunnel, les images uploadées ont une URL `localhost:8000/storage`
 *   injoignable → on la fait passer par le proxy Next `/tunnel-storage`.
 * - Certains endpoints (ex. Storage::url() côté Laravel) renvoient un chemin
 *   RELATIF `/storage/...` plutôt qu'une URL absolue → on le résout par rapport
 *   à l'API configurée (proxy local en dev, domaine API en prod).
 * - En prod (URLs api.bosejour.ci déjà absolues), la valeur est laissée intacte.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';

  // URL absolue vers le backend local (dev sans tunnel) → proxy Next.
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1):8000\/storage/.test(url)) {
    return url.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):8000\/storage/, '/tunnel-storage');
  }
  // Idem pour SecureDocumentController (url() de Laravel renvoie une URL absolue basée sur
  // APP_URL, y compris en dev) : passe par /tunnel-api pour rester sur la même origine que
  // la page (cookie de session Sanctum), au lieu d'un appel direct vers localhost:8000.
  if (/^https?:\/\/(?:localhost|127\.0\.0\.1):8000\/api\/documents\//.test(url)) {
    return url.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):8000\/api/, '/tunnel-api');
  }

  // Autre URL déjà absolue (prod, image externe…) : inchangée.
  if (/^https?:\/\//.test(url)) return url;

  // Chemin relatif `/storage/...` (Storage::url() côté Laravel) : à résoudre.
  if (url.startsWith('/storage')) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.bosejour.ci/api';
    if (apiUrl.startsWith('/')) {
      // Setup proxy local (ex. /tunnel-api) → le stockage est servi via /tunnel-storage
      return url.replace(/^\/storage/, '/tunnel-storage');
    }
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    return `${baseUrl}${url}`;
  }

  return url;
}

/**
 * URL d'un document d'identité/conformité (pièce d'identité, justificatif, RCCM…) —
 * sert désormais SecureDocumentController (disque privé, authentification requise via
 * le cookie de session), jamais l'ancienne URL de stockage public (audit de sécurité
 * externe, 2026-09-27, Phase 6). `field` est le nom de champ du modèle sans le
 * suffixe "_path" (ex. "id_document_recto") ; converti en "id-document-recto".
 */
export function secureDocumentUrl(userId?: number | string | null, field?: string | null): string | null {
  if (!userId || !field) return null;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.bosejour.ci/api';
  const slug = field.replace(/_path$/, '').replace(/_/g, '-');
  return `${apiUrl}/documents/${userId}/${slug}`;
}

/**
 * Formate un montant en entier (sans décimales) avec séparateurs de milliers
 * @param amount - Le montant à formater (peut être number, string ou decimal)
 * @returns Le montant formaté en entier avec séparateurs
 */
export type PriceFormat = 'standard' | 'compact';

function readPriceFormat(): PriceFormat {
  if (typeof window === 'undefined') return 'standard';
  return localStorage.getItem('price_format') === 'compact' ? 'compact' : 'standard';
}

export function formatPrice(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) {
    return '0';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return '0';
  }

  // Arrondir à l'entier le plus proche
  const roundedAmount = Math.round(numAmount);

  // Format compact (préférence utilisateur) : 195 000 → 195K, 1 250 000 → 1,3M
  if (readPriceFormat() === 'compact') {
    const abs = Math.abs(roundedAmount);
    if (abs >= 1_000_000) {
      return `${(roundedAmount / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}M`;
    }
    if (abs >= 1_000) {
      return `${(roundedAmount / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}K`;
    }
  }

  // Formater avec séparateurs de milliers
  return roundedAmount.toLocaleString('fr-FR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

/**
 * Options de compression d'image
 */
interface CompressImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeInMB?: number;
  /**
   * Appelé pour chaque image qui n'a pas pu être traitée (illisible, corrompue, trop lourde
   * pour la mémoire du navigateur…). Si fourni, `compressImages` n'échoue pas : il renvoie
   * les images réussies et laisse l'appelant informer l'utilisateur, fichier par fichier.
   */
  onFileError?: (file: File, error: Error) => void;
}

type DecodedImage = ImageBitmap | HTMLImageElement;

const widthOf = (img: DecodedImage) => ('naturalWidth' in img ? img.naturalWidth : img.width);
const heightOf = (img: DecodedImage) => ('naturalHeight' in img ? img.naturalHeight : img.height);

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible ou corrompue'));
    };
    img.src = url;
  });
}

/** Décode l'image (createImageBitmap : moins de mémoire qu'un <img>, avec repli sur <img>). */
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // format non géré par createImageBitmap : on retente avec <img>
    }
  }
  return loadImageElement(file);
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Compresse une image côté client pour réduire sa taille
 * Style WhatsApp : qualité acceptable avec taille réduite
 * @param file - Le fichier image à compresser
 * @param options - Options de compression
 * @returns Promise<File> - Le fichier compressé
 */
export async function compressImage(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,        // Largeur max (Full HD)
    maxHeight = 1920,       // Hauteur max
    quality = 0.75,         // Qualité 75% (style WhatsApp)
    maxSizeInMB = 2,        // Taille max 2 Mo
  } = options;

  // Si ce n'est pas une image, la retourner telle quelle
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const img = await decodeImage(file);
  try {
    const srcW = widthOf(img);
    const srcH = heightOf(img);

    // Déjà légère et aux bonnes dimensions : rien à faire
    if (file.size <= maxSizeInMB * 1024 * 1024 && srcW <= maxWidth && srcH <= maxHeight) {
      return file;
    }

    // Les PNG sont convertis en JPEG (beaucoup plus légers pour des photos)
    const outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';

    // Sur un appareil à court de mémoire, le canvas peut refuser de se créer : on retente
    // avec des dimensions réduites plutôt que d'abandonner.
    let scale = 1;
    for (let attempt = 0; attempt < 3; attempt++, scale *= 0.7) {
      const { width, height } = calculateDimensions(srcW, srcH, Math.round(maxWidth * scale), Math.round(maxHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        continue;
      }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const blob = await canvasToBlob(canvas, outputType, quality);
      canvas.width = canvas.height = 0; // libère la mémoire du canvas
      if (!blob) {
        continue;
      }

      // Une photo déjà bien compressée peut grossir : on garde alors l'original
      if (blob.size >= file.size && width === srcW && height === srcH && file.type === outputType) {
        return file;
      }

      const name = outputType !== file.type ? file.name.replace(/\.[^./\\]+$/, '') + '.jpg' : file.name;
      return new File([blob], name, { type: outputType, lastModified: file.lastModified });
    }
    throw new Error('Image trop volumineuse pour être traitée par ce navigateur');
  } finally {
    if ('close' in img) {
      img.close();
    }
  }
}

/**
 * Calcule les nouvelles dimensions en conservant le ratio d'aspect
 */
function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let newWidth = width;
  let newHeight = height;

  // Redimensionner si trop large
  if (newWidth > maxWidth) {
    newHeight = Math.round((newHeight * maxWidth) / newWidth);
    newWidth = maxWidth;
  }

  // Redimensionner si trop haute
  if (newHeight > maxHeight) {
    newWidth = Math.round((newWidth * maxHeight) / newHeight);
    newHeight = maxHeight;
  }

  return { width: newWidth, height: newHeight };
}

/**
 * Compresse plusieurs images, UNE À LA FOIS : décoder 10 photos de 12 à 50 mégapixels en
 * parallèle épuise la mémoire d'un PC modeste, et une seule image en échec annulait tout le lot.
 *
 * - avec `options.onFileError` : renvoie les images réussies et signale chaque échec ;
 * - sans : lève une erreur qui nomme la première image en échec.
 */
export async function compressImages(
  files: File[],
  options: CompressImageOptions = {}
): Promise<File[]> {
  const { onFileError, ...compressOptions } = options;
  const results: File[] = [];
  for (const file of files) {
    try {
      results.push(await compressImage(file, compressOptions));
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Compression impossible');
      if (!onFileError) {
        throw new Error(`${file.name} : ${error.message}`);
      }
      onFileError(file, error);
    }
  }
  return results;
}

/** Message affiché quand certaines photos n'ont pas pu être traitées (les autres sont conservées). */
export function imageFailuresMessage(names: string[]): string {
  const list = names.length > 3 ? `${names.slice(0, 3).join(', ')} et ${names.length - 3} autre(s)` : names.join(', ');
  return `${names.length > 1 ? 'Ces photos n’ont pas pu être ajoutées' : 'Cette photo n’a pas pu être ajoutée'} : ${list}. `
    + 'Le fichier est peut-être abîmé ou trop lourd : enregistrez-le à nouveau en JPEG, ou choisissez-en une autre.';
}
