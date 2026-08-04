import type { Metadata, Viewport } from 'next';
import { DM_Sans, Baloo_2, Dancing_Script } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt';
import PagePadding from '@/components/common/PagePadding';
import MobileBottomBar from '@/components/common/MobileBottomBar';

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

export const metadata: Metadata = {
  title: 'bo séjour - Votre séjour commence ici...',
  description: 'bo séjour : trouvez et réservez votre hébergement idéal en Côte d\'Ivoire. Votre séjour commence ici.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'bo séjour',
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
        <meta name="apple-mobile-web-app-title" content="bo séjour" />
      </head>
      <body className={`${dmSans.variable} ${baloo.variable} ${dancingScript.variable}`}>
        <Providers>
          <PagePadding>{children}</PagePadding>
          <MobileBottomBar />
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

