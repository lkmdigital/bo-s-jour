import Link from 'next/link';
import { CalendarCheck, CreditCard, XCircle, FileText, Building2, Search } from 'lucide-react';
import SupportShell from '@/components/common/SupportShell';
import { SUPPORT } from '@/lib/supportContent';

export const metadata = { title: "Centre d'aide — boséjour" };

const TOPICS = [
  { slug: 'reserver', title: 'Réserver', desc: 'Envoyer une demande, la validation du partenaire, réserver pour un proche.', icon: CalendarCheck },
  { slug: 'payer', title: 'Payer', desc: 'Moyens de paiement, réduction du paiement en ligne, garantie de la première nuitée.', icon: CreditCard },
  { slug: 'annuler', title: 'Modifier ou annuler', desc: 'Annuler avec ou sans compte, refus du partenaire, conditions d’annulation.', icon: XCircle },
  { slug: 'reservation', title: 'Ma réservation et mon reçu', desc: 'Retrouver, consulter et imprimer votre réservation et votre reçu.', icon: FileText },
  { slug: 'partenaires', title: 'Partenaires', desc: 'Publier votre établissement et répondre aux demandes.', icon: Building2 },
];

export default function HelpPage() {
  return (
    <SupportShell title="Centre d'aide" intro="Comment pouvons-nous vous aider ? Choisissez une rubrique, retrouvez votre réservation ou contactez-nous.">
      <Link href="/retrouver-reservation" className="flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-5 mb-8 hover:bg-primary/10 transition-colors">
        <Search className="w-6 h-6 text-primary shrink-0" />
        <div>
          <p className="font-semibold">Retrouver ma réservation</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Avec votre numéro de réservation et votre e-mail — sans compte.</p>
        </div>
      </Link>

      <div className="grid sm:grid-cols-2 gap-4">
        {TOPICS.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.slug} href={`/faq#${t.slug}`} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:border-primary transition-colors">
              <Icon className="w-6 h-6 text-primary mb-3" />
              <p className="font-semibold mb-1">{t.title}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t.desc}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-12 rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6">
        <p className="font-semibold mb-3">Besoin d&apos;une aide personnalisée ?</p>
        <ul className="text-sm space-y-1.5 text-gray-700 dark:text-gray-300">
          <li>WhatsApp : <a className="text-primary hover:underline" href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer">écrire à l&apos;assistance</a></li>
          <li>Téléphone : <a className="text-primary hover:underline" href={SUPPORT.phoneHref}>{SUPPORT.phone}</a></li>
          <li>E-mail : <a className="text-primary hover:underline" href={SUPPORT.emailHref}>{SUPPORT.email}</a></li>
          <li><Link className="text-primary hover:underline" href="/contact">Formulaire de contact</Link> · <Link className="text-primary hover:underline" href="/faq">Toutes les questions fréquentes</Link></li>
        </ul>
      </div>
    </SupportShell>
  );
}
