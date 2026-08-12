'use client';

import { useState } from 'react';
import MemberAside from '@/components/dashboard/user/MemberAside';
import { MessageCircle, Mail, Phone, ChevronDown, ShieldCheck } from 'lucide-react';

const FAQ = [
  {
    q: 'Comment fonctionne la garantie de la première nuitée ?',
    a: "Pour confirmer votre réservation, le paiement de la première nuitée (ou du montant intégral selon l'établissement) est requis en ligne. Le solde éventuel se règle directement à l'établissement à votre arrivée.",
  },
  {
    q: "Suis-je protégé si l'établissement refuse ma demande ?",
    a: "Oui. Si l'établissement n'accepte pas votre demande de réservation, vous êtes intégralement remboursé automatiquement sous 24h. Vous n'avez aucune démarche à effectuer.",
  },
  {
    q: 'Comment sont confirmées mes réservations ?',
    a: 'Dès la confirmation, vous recevez un double canal : un e-mail récapitulatif et, si le service est disponible pour votre établissement, un message WhatsApp avec votre code de réservation.',
  },
  {
    q: "Quelles sont les politiques d'annulation ?",
    a: "Chaque établissement applique l'une des trois politiques : Flexible, Modérée ou Stricte. Elle est affichée sur la fiche de l'établissement et rappelée avant le paiement.",
  },
  {
    q: 'Quels moyens de paiement sont acceptés ?',
    a: 'Wave, Orange Money, Visa/Mastercard et Djamo, selon les moyens activés pour votre paiement.',
  },
  {
    q: 'Comment modifier ou annuler une réservation ?',
    a: "Depuis « Mes réservations », ouvrez la réservation concernée : vous y trouverez les options de modification et d'annulation, selon la politique de l'établissement.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 dark:border-gray-700 last:border-0">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 py-4 text-left">
        <span className="font-medium text-sm text-gray-900 dark:text-white">{q}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="text-sm text-gray-600 dark:text-gray-400 pb-4">{a}</p>}
    </div>
  );
}

export default function MemberHelpPage() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Aide & Support</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Une question ? Nous sommes là pour vous aider.</p>
        </div>

        {/* Canaux de contact */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="https://wa.me/2250705654775?text=Bonjour%2C%20j%27ai%20besoin%20d%27assistance." target="_blank" rel="noopener noreferrer"
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center text-center gap-2 hover:border-primary transition-colors">
            <span className="w-11 h-11 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center"><MessageCircle className="w-5 h-5" /></span>
            <p className="font-semibold text-sm">WhatsApp</p>
            <p className="text-xs text-gray-500">Réponse rapide</p>
          </a>
          <a href="mailto:support@bosejour.ci"
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center text-center gap-2 hover:border-primary transition-colors">
            <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Mail className="w-5 h-5" /></span>
            <p className="font-semibold text-sm">E-mail</p>
            <p className="text-xs text-gray-500">support@bosejour.ci</p>
          </a>
          <a href="tel:+2250706402929"
            className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 flex flex-col items-center text-center gap-2 hover:border-primary transition-colors">
            <span className="w-11 h-11 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center"><Phone className="w-5 h-5" /></span>
            <p className="font-semibold text-sm">Téléphone</p>
            <p className="text-xs text-gray-500">+225 07 06 40 29 29</p>
          </a>
        </div>

        {/* Réassurance sécurité */}
        <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-5 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Toute réservation payée en ligne est protégée : en cas de refus de l&apos;établissement, vous êtes intégralement remboursé sous 24h.
          </p>
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="font-bold mb-2">Questions fréquentes</h2>
          <div>
            {FAQ.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
          </div>
        </div>
      </div>

      <MemberAside />
    </div>
  );
}
