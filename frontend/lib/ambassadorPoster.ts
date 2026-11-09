/**
 * Affiche d'ambassadeur boséjour (proposition A « Signature rouge », choisie le 2026-11-10) : dessinée directement sur un canvas,
 * à n'importe quelle résolution, pour un téléchargement prêt à imprimer (PNG haute résolution, PDF A4 ou A3) sans serveur d'images.
 * Charte : rouge #FF0000, noir #0F0F0F, blanc ; DM Sans pour les textes ; logo inversé (cercle blanc) sur fond rouge ;
 * motif de pins. Le QR code encode le lien « scan » de l'ambassadeur (/p/CODE?s=qr).
 */
import { create as createQr } from 'qrcode';

export const POSTER_W = 794;   // l'affiche est dessinée dans un repère de 794 × 1123 (A4 à 96 dpi), puis mise à l'échelle
export const POSTER_H = 1123;

export interface PosterOptions {
  /** Lien encodé dans le QR code. */
  link: string;
  /** Nom affiché en pied d'affiche : « Invitation de … ». */
  name: string;
  /** Remise de bienvenue annoncée (en %). 0 : pas de badge. */
  percent: number;
}

export type PosterFormat = 'a4' | 'a3';
export type PosterKind = 'png' | 'pdf';

// Largeur en pixels de l'image selon le format : A4 à 300 dpi ; A3 plafonné pour ne pas dépasser les limites de canvas des mobiles.
const PIXEL_WIDTH: Record<PosterFormat, number> = { a4: 2480, a3: 3300 };
const PAGE_PT: Record<PosterFormat, { w: number; h: number }> = { a4: { w: 595.276, h: 841.89 }, a3: { w: 841.89, h: 1190.551 } };

const RED = '#FF0000';
const BLACK = '#0F0F0F';
const FONT = 'BoSejourPoster';
const DM_ASCENT = 0.992;   // métriques de DM Sans : calage des lignes de base comme en CSS
const DM_CONTENT = 1.302;

// ─── Ressources ────────────────────────────────────────────────────────────────────────────────────────────────
let fontPromise: Promise<void> | null = null;
function loadFont(): Promise<void> {
  if (!fontPromise) {
    const face = new FontFace(FONT, 'url(/fonts/poster/DMSans-latin-var.woff2)', { weight: '400 800', style: 'normal' });
    fontPromise = face.load().then((f) => { document.fonts.add(f); });
    fontPromise.catch(() => { fontPromise = null; });
  }
  return fontPromise;
}

const images = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string): Promise<HTMLImageElement> {
  let p = images.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => { images.delete(src); reject(new Error(`Image introuvable : ${src}`)); };
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

// ─── Outils de dessin ──────────────────────────────────────────────────────────────────────────────────────────
const PIN_PATH = 'M12 1.5c-4.2 0-7.5 3.2-7.5 7.4 0 5.3 7.5 13.6 7.5 13.6s7.5-8.3 7.5-13.6C19.5 4.7 16.2 1.5 12 1.5z';

/** Ligne de base d'un texte posé dans une boîte CSS de hauteur de ligne `lh` dont le haut est `top`. */
const baseline = (top: number, lh: number, fs: number) => top + (lh - DM_CONTENT * fs) / 2 + DM_ASCENT * fs;

/** Vrai si le navigateur gère `letterSpacing` sur le canvas (sinon on espace les lettres une à une). */
const nativeSpacing = (ctx: CanvasRenderingContext2D): boolean => 'letterSpacing' in ctx;

function setFont(ctx: CanvasRenderingContext2D, weight: number, size: number, spacing = 0) {
  ctx.font = `${weight} ${size}px ${FONT}, system-ui, sans-serif`;
  if (nativeSpacing(ctx)) ctx.letterSpacing = `${spacing}px`;
}

function fillText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing = 0, align: 'left' | 'center' | 'right' = 'left') {
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const native = nativeSpacing(ctx);
  const w = native ? ctx.measureText(text).width : [...text].reduce((s, ch) => s + ctx.measureText(ch).width + spacing, 0);
  const start = align === 'left' ? x : align === 'center' ? x - w / 2 : x - w;
  if (native || !spacing) {
    ctx.fillText(text, start, y);
  } else {
    let cx = start;
    for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + spacing; }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string, hole?: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = fill;
  ctx.fill(new Path2D(PIN_PATH));
  if (hole) { ctx.fillStyle = hole; ctx.beginPath(); ctx.arc(12, 9, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function drawPhone(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundRect(ctx, 6.5, 2.5, 11, 19, 2.6);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(12, 18, 1, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** Remise affichée : « 5 » ou « 7,5 ». */
const formatPercent = (p: number) => String(Number.isInteger(p) ? p : p.toFixed(1).replace('.', ','));

// ─── QR code habillé (modules arrondis, coins rouges, pastille « bo » au centre) ───────────────────────────────
function drawQr(ctx: CanvasRenderingContext2D, link: string, x: number, y: number, size: number, bo: HTMLImageElement) {
  const qr = createQr(link, { errorCorrectionLevel: 'H' });   // niveau H : lisible malgré la pastille centrale
  const n = qr.modules.size;
  const u = size / (n + 8);                                   // marge blanche de 4 modules (norme) incluse
  const ox = x + 4 * u;
  const oy = y + 4 * u;
  const c = n / 2;
  const inEye = (mx: number, my: number) => (mx < 8 && my < 8) || (mx >= n - 8 && my < 8) || (mx < 8 && my >= n - 8);

  ctx.fillStyle = '#fff';
  ctx.fillRect(x, y, size, size);

  ctx.fillStyle = BLACK;
  for (let my = 0; my < n; my++) {
    for (let mx = 0; mx < n; mx++) {
      if (!qr.modules.get(my, mx) || inEye(mx, my) || Math.hypot(mx + 0.5 - c, my + 0.5 - c) < 5.3) continue;
      roundRect(ctx, ox + (mx + 0.06) * u, oy + (my + 0.06) * u, 0.88 * u, 0.88 * u, 0.3 * u);
      ctx.fill();
    }
  }

  const eye = (ex: number, ey: number) => {
    ctx.strokeStyle = BLACK;
    ctx.lineWidth = u;
    roundRect(ctx, ox + (ex + 0.5) * u, oy + (ey + 0.5) * u, 6 * u, 6 * u, 1.9 * u);
    ctx.stroke();
    ctx.fillStyle = RED;
    roundRect(ctx, ox + (ex + 2) * u, oy + (ey + 2) * u, 3 * u, 3 * u, 0.95 * u);
    ctx.fill();
  };
  eye(0, 0); eye(n - 7, 0); eye(0, n - 7);

  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(ox + c * u, oy + c * u, 4.7 * u, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(bo, ox + (c - 4.1) * u, oy + (c - 4.1) * u, 8.2 * u, 8.2 * u);
}

// ─── L'affiche ────────────────────────────────────────────────────────────────────────────────────────────────
export async function renderPoster(opts: PosterOptions, widthPx: number): Promise<HTMLCanvasElement> {
  const [, logo, bo] = await Promise.all([
    loadFont(),
    loadImage('/images/brand/poster/logo-reversed-whitepin.png'),
    loadImage('/images/brand/poster/logo-bo-black.png'),
  ]);

  const scale = widthPx / POSTER_W;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(POSTER_W * scale);
  canvas.height = Math.round(POSTER_H * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponible');
  ctx.scale(scale, scale);
  ctx.imageSmoothingQuality = 'high';

  // Fond rouge + motif de pins
  ctx.fillStyle = RED;
  ctx.fillRect(0, 0, POSTER_W, POSTER_H);
  ctx.globalAlpha = 0.12;
  for (let ty = 0; ty < POSTER_H; ty += 64) for (let tx = 0; tx < POSTER_W; tx += 64) drawPin(ctx, tx + 20 + 0, ty + 14, 24 * 1.05, '#000');
  ctx.globalAlpha = 1;

  // Logo (version inversée de la charte)
  ctx.drawImage(logo, 50, 46, 310, (310 * logo.naturalHeight) / logo.naturalWidth);

  // Badge de remise
  if (opts.percent > 0) {
    ctx.save();
    ctx.translate(662, 112);
    ctx.rotate((8 * Math.PI) / 180);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, 0, 84, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = BLACK;
    ctx.beginPath(); ctx.arc(0, 0, 78, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    const top = -44.1;
    setFont(ctx, 800, 52, -2);
    fillText(ctx, `−${formatPercent(opts.percent)} %`, 0, baseline(top, 52, 52), -2, 'center');
    setFont(ctx, 700, 14, 0);
    fillText(ctx, 'sur votre', 0, baseline(top + 56, 16.1, 14), 0, 'center');
    // « 1re nuitée » : « re » en exposant
    const y2 = baseline(top + 56 + 16.1, 16.1, 14);
    const wOne = ctx.measureText('1').width;
    const wNuit = ctx.measureText(' nuitée').width;
    setFont(ctx, 700, 9, 0);
    const wRe = ctx.measureText('re').width;
    const x0 = -(wOne + wRe + wNuit) / 2;
    setFont(ctx, 700, 14, 0); fillText(ctx, '1', x0, y2);
    setFont(ctx, 700, 9, 0); fillText(ctx, 're', x0 + wOne, y2 - 5);
    setFont(ctx, 700, 14, 0); fillText(ctx, ' nuitée', x0 + wOne + wRe, y2);
    ctx.restore();
  }

  // Titre et sous-titre
  ctx.fillStyle = '#fff';
  setFont(ctx, 800, 74, -2);
  fillText(ctx, 'Scannez, réservez,', POSTER_W / 2, baseline(214, 74, 74), -2, 'center');
  fillText(ctx, 'voyagez.', POSTER_W / 2, baseline(214 + 74, 74, 74), -2, 'center');
  ctx.globalAlpha = 0.96;
  setFont(ctx, 500, 22, 0);
  fillText(ctx, "Hôtels, écolodges et résidences en Côte d'Ivoire", POSTER_W / 2, baseline(378, 22 * DM_CONTENT, 22), 0, 'center');
  ctx.globalAlpha = 1;

  // Carte blanche + QR code
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, 150, 436, 494, 494, 54); ctx.fill();
  ctx.fillStyle = '#fff';
  roundRect(ctx, 160, 446, 474, 474, 44); ctx.fill();
  drawQr(ctx, opts.link, 182, 468, 430, bo);

  // Bouton « SCANNEZ-MOI » à cheval sur le bas de la carte
  setFont(ctx, 800, 19, 2);
  const label = 'SCANNEZ-MOI';
  const labelW = ctx.measureText(label).width + (nativeSpacing(ctx) ? 0 : [...label].length * 2);
  const pillW = 34 + 26 + 12 + labelW + 34;
  const pillH = 54.7;
  const pillX = (POSTER_W - pillW) / 2;
  const pillY = 947 - pillH;
  ctx.fillStyle = BLACK;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2); ctx.fill();
  drawPhone(ctx, pillX + 34, pillY + (pillH - 26) / 2, 26, '#fff');
  ctx.fillStyle = '#fff';
  fillText(ctx, label, pillX + 34 + 26 + 12, baseline(pillY + 15, 19 * DM_CONTENT, 19), 2);

  // Consigne
  ctx.globalAlpha = 0.96;
  setFont(ctx, 500, 18, 0);
  fillText(ctx, "Ouvrez l'appareil photo de votre téléphone et pointez le QR code.", POSTER_W / 2, baseline(962, 18 * DM_CONTENT, 18), 0, 'center');
  ctx.globalAlpha = 1;

  // Pied d'affiche
  ctx.fillStyle = BLACK;
  ctx.fillRect(0, POSTER_H - 96, POSTER_W, 96);
  const mid = POSTER_H - 48;
  ctx.fillStyle = '#fff';
  setFont(ctx, 700, 25, 0.3);
  fillText(ctx, 'bosejour.ci', 52, mid - (DM_CONTENT * 25) / 2 + DM_ASCENT * 25, 0.3);

  // « Invitation de … » : le nom est réduit s'il est long
  let fs = 17;
  const maxW = 470;
  let name = opts.name.trim() || 'boséjour';
  const measure = (size: number) => {
    setFont(ctx, 400, size, 0); const a = ctx.measureText('Invitation de ').width;
    setFont(ctx, 700, size, 0); const b = ctx.measureText(name).width;
    return { a, b };
  };
  let m = measure(fs);
  while (28 + m.a + m.b > maxW && fs > 12) { fs -= 1; m = measure(fs); }
  while (28 + m.a + m.b > maxW && name.length > 4) { name = name.slice(0, -2).trimEnd() + '…'; m = measure(fs); }
  const total = 28 + m.a + m.b;
  const startX = POSTER_W - 52 - total;
  const by = mid - (DM_CONTENT * fs) / 2 + DM_ASCENT * fs;
  drawPin(ctx, startX, mid - 10, 20, RED, BLACK);
  ctx.fillStyle = '#fff';
  ctx.globalAlpha = 0.95;
  setFont(ctx, 400, fs, 0); fillText(ctx, 'Invitation de ', startX + 28, by);
  setFont(ctx, 700, fs, 0); fillText(ctx, name, startX + 28 + m.a, by);
  ctx.globalAlpha = 1;

  return canvas;
}

// ─── Exports ─────────────────────────────────────────────────────────────────────────────────────────────────────
const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Export impossible'))), type, quality));

/** PDF d'une page contenant l'image JPEG de l'affiche, plein format (A4 ou A3), sans dépendance externe. */
export function jpegToPdf(jpeg: Uint8Array, px: { w: number; h: number }, pt: { w: number; h: number }): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let len = 0;
  const push = (b: Uint8Array | string) => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
  const obj = (n: number, body: () => void) => { offsets[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };

  push('%PDF-1.4\n%âãÏÓ\n');
  obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
  obj(3, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pt.w.toFixed(2)} ${pt.h.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
  obj(4, () => {
    push(`<< /Type /XObject /Subtype /Image /Width ${px.w} /Height ${px.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    push(jpeg);
    push('\nendstream');
  });
  const content = `q ${pt.w.toFixed(2)} 0 0 ${pt.h.toFixed(2)} 0 0 cm /Im0 Do Q`;
  obj(5, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));

  const xref = len;
  push(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map((i) => `${String(offsets[i]).padStart(10, '0')} 00000 n \n`).join('')}`);
  push(`trailer\n<< /Size 6 /Root 1 0 R /Info << /Title (Affiche boséjour) >> >>\nstartxref\n${xref}\n%%EOF`);

  return new Blob(parts as BlobPart[], { type: 'application/pdf' });
}

function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Génère et télécharge l'affiche (`kind` : PNG haute résolution ou PDF ; `format` : A4 ou A3). */
export async function downloadPoster(opts: PosterOptions, kind: PosterKind, format: PosterFormat, filenameBase: string): Promise<void> {
  const canvas = await renderPoster(opts, PIXEL_WIDTH[format]);
  const name = `${filenameBase}-${format.toUpperCase()}`;

  if (kind === 'png') {
    save(await toBlob(canvas, 'image/png'), `${name}.png`);
    return;
  }
  const jpeg = new Uint8Array(await (await toBlob(canvas, 'image/jpeg', 0.95)).arrayBuffer());
  save(jpegToPdf(jpeg, { w: canvas.width, h: canvas.height }, PAGE_PT[format]), `${name}.pdf`);
}
