import type { Metadata, Viewport } from 'next';
import { DM_Sans, Baloo_2, Dancing_Script } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';
import PagePadding from '@/components/common/PagePadding';
import MobileBottomBar from '@/components/common/MobileBottomBar';
import BrandIntro from '@/components/intro/BrandIntro';
import FilmLauncher from '@/components/film/FilmLauncher';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

// Police du logo (charte bo séjour)
const baloo = Baloo_2({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-baloo',
  display: 'swap',
});

// Police du slogan / des accroches (charte bo séjour)
const dancingScript = Dancing_Script({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-dancing',
  display: 'swap',
});

// Animation d'ouverture (components/intro/BrandIntro) : décidée AVANT le premier
// rendu pour que le calque soit là dès la première image, sans flash du site.
// Une fois par session, uniquement sur les pages publiques d'entrée — jamais au
// retour d'un paiement, dans un tableau de bord ou un lien reçu par e-mail
// (auth, avis, réservation). Version « fondu » si les animations sont réduites
// (préférence système ou réglage Apparence du site, clé `reduce_motion`).
const INTRO_SCRIPT = `(function(){try{
var p=location.pathname;
if(!/^\\/(?:accommodations(?:\\/.*)?|rooms\\/.+|avis-clients|faq|help|contact|voyageur|partenaire)?\\/?$/.test(p))return;
if(navigator.webdriver||sessionStorage.getItem('bs-intro'))return;
sessionStorage.setItem('bs-intro','1');
var d=document.documentElement;
var r=matchMedia('(prefers-reduced-motion: reduce)').matches||localStorage.getItem('reduce_motion')==='1';
d.setAttribute('data-intro',r?'reduced':'full');
if(localStorage.getItem('locale')==='en')d.setAttribute('data-intro-lang','en');
}catch(e){}})();`;

export const metadata: Metadata = {
  title: 'BoSéjour - Votre séjour commence ici...',
  description: 'BoSéjour : trouvez et réservez votre hébergement idéal en Côte d\'Ivoire. Votre séjour commence ici.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BoSéjour',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

// Next.js recommande d'exposer le viewport séparément
export const viewport: Viewport = {
  themeColor: '#FF0000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const oneSignalAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FF0000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BoSéjour" />
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
      </head>
      <body className={`${dmSans.variable} ${baloo.variable} ${dancingScript.variable}`}>
        <BrandIntro />
        <Providers>
          <PagePadding>{children}</PagePadding>
          <MobileBottomBar />
          <FilmLauncher />
          <ServiceWorkerRegistration />
          <PWAInstallPrompt />
        </Providers>
        <Script
          src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
          strategy="afterInteractive"
        />
        <Script id="onesignal-init" strategy="afterInteractive">
          {`
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(async function(OneSignal) {
              await OneSignal.init({
                appId: "${oneSignalAppId ?? ''}",
              });
            });
          `}
        </Script>
      </body>
    </html>
  );
}

