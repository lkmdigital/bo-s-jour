/**
 * Concatène des classes conditionnelles (utilitaire léger type clsx).
 * Ex: cn('base', isActive && 'active', error ? 'text-red' : undefined)
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Normalise une URL d'image renvoyée par l'API.
 * En dev via tunnel, les images uploadées ont une URL `localhost:8000/storage`
 * injoignable → on la fait passer par le proxy Next `/tunnel-storage`.
 * En prod (URLs api.bosejour.ci), la valeur est laissée intacte.
 */
export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  return url.replace(/^https?:\/\/(?:localhost|127\.0\.0\.1):8000\/storage/, '/tunnel-storage');
}

/**
 * Formate un montant en entier (sans décimales) avec séparateurs de milliers
 * @param amount - Le montant à formater (peut être number, string ou decimal)
 * @returns Le montant formaté en entier avec séparateurs
 */
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
