/**
 * Concatène des classes conditionnelles (utilitaire léger type clsx).
 * Ex: cn('base', isActive && 'active', error ? 'text-red' : undefined)
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
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

  // Si ce n'est pas une image ou si elle est déjà petite, la retourner telle quelle
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Si l'image est déjà plus petite que la taille max, la retourner
  if (file.size <= maxSizeInMB * 1024 * 1024) {
    // On pourrait quand même redimensionner si trop grande en dimensions
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);

        // Si les dimensions sont acceptables, retourner le fichier original
        if (img.width <= maxWidth && img.height <= maxHeight) {
          resolve(file);
          return;
        }

        // Sinon, redimensionner
        compressImageWithCanvas(img, file, maxWidth, maxHeight, quality, resolve, reject);
      };
      img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'));
    });
  }

  // Compression nécessaire
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      compressImageWithCanvas(img, file, maxWidth, maxHeight, quality, resolve, reject);
    };
    img.onerror = () => reject(new Error('Erreur lors du chargement de l\'image'));
  });
}

/**
 * Compresse une image en utilisant un canvas
 */
function compressImageWithCanvas(
  img: HTMLImageElement,
  originalFile: File,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  resolve: (file: File) => void,
  reject: (error: Error) => void
): void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    reject(new Error('Impossible de créer le contexte canvas'));
    return;
  }

  // Calculer les nouvelles dimensions en conservant le ratio
  let { width, height } = calculateDimensions(img.width, img.height, maxWidth, maxHeight);

  canvas.width = width;
  canvas.height = height;

  // Dessiner l'image redimensionnée
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  // Convertir en blob avec la qualité souhaitée
  const outputType = originalFile.type === 'image/png' ? 'image/jpeg' : originalFile.type;

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        reject(new Error('Erreur lors de la compression de l\'image'));
        return;
      }

      // Créer un nouveau fichier avec le même nom mais compressé
      const compressedFile = new File(
        [blob],
        originalFile.name,
        { type: outputType, lastModified: originalFile.lastModified }
      );

      resolve(compressedFile);
    },
    outputType,
    quality
  );
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
 * Compresse plusieurs images en parallèle
 * @param files - Tableau de fichiers à compresser
 * @param options - Options de compression
 * @returns Promise<File[]> - Tableau de fichiers compressés
 */
export async function compressImages(
  files: File[],
  options: CompressImageOptions = {}
): Promise<File[]> {
  const promises = files.map(file => compressImage(file, options));
  return Promise.all(promises);
}
