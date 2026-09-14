'use client';

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWA_PROMPT_DISMISS_KEY = 'pwa-prompt-dismiss-count';
const PWA_PROMPT_MAX_SHOW = 3;

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }
    try {
      if (parseInt(localStorage.getItem(PWA_PROMPT_DISMISS_KEY) || '0', 10) >= PWA_PROMPT_MAX_SHOW) return;
    } catch {
      // ignore
    }
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      try {
        localStorage.removeItem(PWA_PROMPT_DISMISS_KEY);
      } catch {
        // ignore
      }
    });
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Afficher le prompt d'installation
    deferredPrompt.prompt();

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installée avec succès');
    } else {
      console.log('Installation PWA refusée');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      const count = parseInt(localStorage.getItem(PWA_PROMPT_DISMISS_KEY) || '0', 10);
      localStorage.setItem(PWA_PROMPT_DISMISS_KEY, String(count + 1));
    } catch {
      // ignore
    }
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  try {
    if (parseInt(localStorage.getItem(PWA_PROMPT_DISMISS_KEY) || '0', 10) >= PWA_PROMPT_MAX_SHOW) {
      return null;
    }
  } catch {
    // ignore
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-slide-up">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Installer BoSéjour
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Accédez rapidement à l'application
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 btn-primary text-sm py-2"
          >
            Installer
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}



