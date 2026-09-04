'use client';

import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import {
  Search, ShieldCheck, MessageCircle, CreditCard, Gift, Heart, Star, Building2,
  Wallet, ArrowRight, LogIn, MapPin, Percent, MessagesSquare, Users as UsersIcon,
} from 'lucide-react';

const BENEFITS = [
  { icon: Search, title: 'Des séjours vérifiés', desc: "Hôtels, résidences, villas et maisons d'hôtes partout en Côte d'Ivoire, contrôlés avant publication." },
  { icon: CreditCard, title: 'Paiement flexible et sécurisé', desc: 'Acompte ou paiement intégral — Visa, Mastercard, Djamo, Mobile Money.' },
  { icon: MessageCircle, title: 'Confirmation E-mail + WhatsApp', desc: 'Votre code de réservation vous parvient instantanément, sur les deux canaux.' },
  { icon: ShieldCheck, title: 'Annulations claires', desc: 'Politique Flexible, Modérée ou Stricte affichée avant de réserver — aucune mauvaise surprise.' },
  { icon: Gift, title: 'Programme de fidélité', desc: 'Cumulez des avantages à chaque séjour réservé sur bo séjour.' },
  { icon: Heart, title: 'Vos favoris', desc: 'Enregistrez les établissements qui vous plaisent pour les retrouver facilement.' },
  { icon: Wallet, title: 'Mes avoirs', desc: 'Vos remboursements et avoirs regroupés dans un espace dédié, réutilisables en un clic.' },
  { icon: Star, title: 'Avis authentiques', desc: "Consultez les retours d'autres voyageurs avant de réserver, et laissez le vôtre après votre séjour." },
];

const FLOW = [
  { icon: Search, label: 'Vous recherchez et comparez' },
  { icon: Building2, label: 'Vous choisissez votre hébergement' },
  { icon: CreditCard, label: 'Vous payez en ligne en sécurité' },
  { icon: MessageCircle, label: 'Confirmation E-mail + WhatsApp' },
  { icon: ShieldCheck, label: 'Séjour garanti' },
];

const MODULES = [
  { icon: Search, label: 'Recherche & comparateur' },
  { icon: MapPin, label: 'Réservations' },
  { icon: Heart, label: 'Favoris' },
  { icon: Percent, label: 'Promotions & bons plans' },
  { icon: Gift, label: 'Programme de fidélité' },
  { icon: Wallet, label: 'Mes avoirs' },
  { icon: UsersIcon, label: 'Espace Entreprise' },
  { icon: MessagesSquare, label: 'Messagerie avec l’hôte' },
];

export default function TravelerLandingPage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-16 sm:py-24 text-center max-w-3xl">
          <p className="font-slogan text-3xl sm:text-4xl text-primary mb-3">Votre prochain séjour commence ici</p>
          <h1 className="text-3xl sm:text-5xl font-bold mb-5">Rejoignez BoSéjour, la plateforme qui protège hôtes et voyageurs</h1>
          <p className="text-gray-300 text-lg mb-8">
            Trouvez des hébergements vérifiés, réservez en toute confiance et payez en sécurité — où que vous alliez
            en Côte d&apos;Ivoire.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/register" className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base">
              Créer mon compte <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/30 text-white hover:bg-white/10 transition-colors text-base">
              <LogIn className="w-4 h-4" /> Se connecter
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Inscription gratuite — quelques informations suffisent pour réserver.
          </p>
        </div>
      </section>

      {/* Pourquoi rejoindre */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Pourquoi réserver sur bo séjour ?</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xl mx-auto">
          Tout ce dont vous avez besoin pour voyager l&apos;esprit tranquille, réuni dans un seul espace.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BENEFITS.map((b) => (
            <div key={b.title} className="card">
              <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <b.icon className="w-5 h-5" />
              </span>
              <p className="font-bold text-gray-900 dark:text-white mb-1">{b.title}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Fonctionnement */}
      <section className="bg-gray-50 dark:bg-gray-900 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">Comment ça marche</h2>
          <div className="flex flex-wrap items-center justify-center gap-3 max-w-4xl mx-auto">
            {FLOW.map((f, i) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="flex flex-col items-center text-center w-32">
                  <span className="w-12 h-12 rounded-full bg-white dark:bg-gray-800 border-2 border-primary text-primary flex items-center justify-center mb-2">
                    <f.icon className="w-5 h-5" />
                  </span>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{f.label}</p>
                </div>
                {i < FLOW.length - 1 && <ArrowRight className="w-4 h-4 text-gray-300 hidden sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Espace membre */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Un espace voyageur complet</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xl mx-auto">
          Tout ce qu&apos;il vous faut pour gérer vos séjours au quotidien.
        </p>
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {MODULES.map((m) => (
            <span key={m.label} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
              <m.icon className="w-4 h-4 text-primary" /> {m.label}
            </span>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="container mx-auto px-4 pb-16">
        <div className="rounded-3xl bg-primary text-white p-10 sm:p-14 text-center max-w-3xl mx-auto">
          <ShieldCheck className="w-10 h-10 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Prêt à réserver ?</h2>
          <p className="text-white/90 mb-6">
            Créez votre compte en une minute et trouvez votre prochain hébergement en Côte d&apos;Ivoire.
          </p>
          <Link href="/auth/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-primary font-semibold hover:bg-gray-100 transition-colors">
            Créer mon compte <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
