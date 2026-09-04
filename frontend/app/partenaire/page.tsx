'use client';

import Link from 'next/link';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import {
  TrendingUp, CalendarCheck, Settings2, Globe2, MessageCircle, CreditCard, ShieldCheck,
  Tag, HeartHandshake, ArrowRight, User, Wallet, CalendarRange, LineChart,
  Percent, Users as UsersIcon, MessagesSquare, Link2, BadgePercent,
} from 'lucide-react';

const BENEFITS = [
  { icon: TrendingUp, title: 'Plus de visibilité', desc: "Votre établissement exposé à une clientèle nationale et internationale." },
  { icon: CalendarCheck, title: 'Plus de réservations', desc: "Recevez davantage de demandes, confirmées automatiquement." },
  { icon: Settings2, title: 'Gestion simplifiée', desc: 'Un seul espace pour gérer chambres, tarifs, calendrier et paiements.' },
  { icon: MessageCircle, title: 'Double confirmation E-mail + WhatsApp', desc: "Vos clients reçoivent leur code de réservation instantanément — moins d'annulations de dernière minute." },
  { icon: CreditCard, title: 'Paiement en ligne flexible', desc: 'Acompte (dès 1 nuitée) ou paiement intégral — Visa, Mastercard, Djamo, Mobile Money.' },
  { icon: ShieldCheck, title: 'Annulations maîtrisées', desc: "Politique Flexible, Modérée ou Stricte, affichée clairement au voyageur." },
  { icon: Tag, title: 'Promotions & offres', desc: 'Créez vos campagnes pour attirer davantage de clients.' },
  { icon: HeartHandshake, title: 'Accompagnement bo séjour', desc: 'Notre équipe vous accompagne à chaque étape.' },
];

const FLOW = [
  { icon: UsersIcon, label: 'Voyageur réserve sur bo séjour' },
  { icon: CreditCard, label: 'Paiement en ligne sécurisé' },
  { icon: Settings2, label: "L'Extranet confirme automatiquement" },
  { icon: MessageCircle, label: 'Confirmation E-mail + WhatsApp' },
  { icon: ShieldCheck, label: 'Séjour garanti' },
];

const MODULES = [
  { icon: LineChart, label: 'Tableau de bord' },
  { icon: CalendarRange, label: 'Réservations' },
  { icon: CalendarCheck, label: 'Calendrier' },
  { icon: Percent, label: 'Tarification dynamique' },
  { icon: BadgePercent, label: 'Promotions & offres' },
  { icon: LineChart, label: 'Statistiques' },
  { icon: Wallet, label: 'Comptabilité' },
  { icon: UsersIcon, label: 'Gestion des équipes' },
  { icon: MessagesSquare, label: 'Messagerie' },
  { icon: Link2, label: 'Synchronisation externe' },
  { icon: Wallet, label: 'Avoirs & remboursements' },
];

export default function PartnerLandingPage() {
  return (
    <div className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="bg-gray-950 text-white">
        <div className="container mx-auto px-4 py-16 sm:py-24 text-center max-w-3xl">
          <p className="font-slogan text-3xl sm:text-4xl text-primary mb-3">Votre établissement mérite plus de visibilité</p>
          <h1 className="text-3xl sm:text-5xl font-bold mb-5">Rejoignez BoSéjour, la plateforme qui protège hôtes et voyageurs</h1>
          <p className="text-gray-300 text-lg mb-8">
            Publiez votre établissement, recevez des réservations confirmées automatiquement, et soyez payé en toute
            sécurité — en quelques étapes, à votre rythme.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/auth/register-partenaire" className="btn-primary inline-flex items-center gap-2 px-6 py-3 text-base">
              Créer mon établissement <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/login?type=partenaire" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-white/30 text-white hover:bg-white/10 transition-colors text-base">
              <User className="w-4 h-4" /> Se connecter
            </Link>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            Configurateur en quelques étapes — sauvegarde automatique à chaque modification.
          </p>
        </div>
      </section>

      {/* Pourquoi rejoindre */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Pourquoi rejoindre bo séjour ?</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xl mx-auto">
          Tout ce dont votre établissement a besoin pour grandir, réuni dans un seul espace.
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

      {/* Modules disponibles */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">Un Extranet complet</h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-xl mx-auto">
          Tous les modules pour piloter votre activité au quotidien.
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
          <Globe2 className="w-10 h-10 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">Prêt à commencer ?</h2>
          <p className="text-white/90 mb-6">
            Créez votre compte en une minute. La configuration de votre établissement se fait ensuite, à votre rythme.
          </p>
          <Link href="/auth/register-partenaire" className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-primary font-semibold hover:bg-gray-100 transition-colors">
            Créer mon établissement <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
