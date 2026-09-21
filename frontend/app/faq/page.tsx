import SupportShell from '@/components/common/SupportShell';
import Link from 'next/link';
import { FAQ_GROUPS, SUPPORT } from '@/lib/supportContent';

export const metadata = { title: 'FAQ — boséjour' };

export default function FaqPage() {
  return (
    <SupportShell title="Questions fréquentes" intro="Les réponses aux questions les plus courantes sur la réservation, le paiement et l'annulation.">
      <nav className="flex flex-wrap gap-2 mb-10" aria-label="Rubriques">
        {FAQ_GROUPS.map((g) => (
          <a key={g.slug} href={`#${g.slug}`} className="px-3.5 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-sm hover:border-primary hover:text-primary transition-colors">
            {g.title}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        {FAQ_GROUPS.map((g) => (
          <section key={g.slug} id={g.slug} className="scroll-mt-28">
            <h2 className="text-xl font-bold mb-4">{g.title}</h2>
            <div className="divide-y divide-gray-200 dark:divide-gray-700 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              {g.items.map((item) => (
                <details key={item.q} className="group px-5 py-4">
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium">
                    {item.q}
                    <span className="text-primary text-xl leading-none transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-6 text-center">
        <p className="font-semibold mb-1">Vous ne trouvez pas votre réponse ?</p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Notre équipe vous répond par WhatsApp, téléphone ou e-mail.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/contact" className="btn-primary">Nous contacter</Link>
          <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-outline">WhatsApp</a>
        </div>
      </div>
    </SupportShell>
  );
}
