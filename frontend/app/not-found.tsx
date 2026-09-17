'use client';

import Link from 'next/link';
import { Home, Search, ArrowLeft, MapPin } from 'lucide-react';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import Brand from '@/components/common/Brand';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-2xl">
          {/* Animation fun */}
          <div className="mb-8 relative">
            <div className="text-9xl font-bold text-primary/20 dark:text-primary/10 mb-4">
              404
            </div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <MapPin className="w-24 h-24 text-primary animate-bounce" />
            </div>
          </div>

          <h1 className="text-4xl font-bold mb-4">
            Oups ! Cette destination n'existe pas 🗺️
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            Il semble que vous ayez pris un mauvais chemin. Pas de panique, 
            nous allons vous aider à retrouver votre route !
          </p>

          {/* Messages fun aléatoires */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-8">
            <p className="text-yellow-800 dark:text-yellow-300">
              💡 <strong>Astuce :</strong> Même les meilleurs voyageurs se perdent parfois. 
              C'est l'occasion de découvrir de nouveaux horizons !
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="btn-primary inline-flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" />
              Retour à l'accueil
            </Link>
            
            <Link
              href="/accommodations"
              className="btn-secondary inline-flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Explorer les hébergements
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="btn-outline inline-flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Page précédente
            </button>
          </div>

          {/* Fun facts */}
          <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              💭 <em>Saviez-vous ?</em> En Côte d'Ivoire, il y a des milliers d'hébergements 
              répertoriés sur <Brand />. Explorez-les tous !
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

