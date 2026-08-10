'use client';

import Link from 'next/link';
import { Facebook, Twitter, Instagram, Youtube, Apple, Play } from 'lucide-react';
import Logo from './Logo';

const COLUMNS = [
  {
    title: 'Explorer',
    links: [
      { label: 'Destinations tendances', href: '/accommodations' },
      { label: "Points chauds de l'été", href: '/accommodations' },
      { label: 'Escapades hivernales', href: '/accommodations' },
      { label: 'Offres du week-end', href: '/accommodations' },
      { label: 'Séjours en famille', href: '/accommodations' },
    ],
  },
  {
    title: 'Types de propriétés',
    links: [
      { label: 'Hôtels', href: '/accommodations?type=hotel' },
      { label: 'Appartements', href: '/accommodations?type=apartment' },
      { label: 'Villas', href: '/accommodations?type=villa' },
      { label: 'Cabines', href: '/accommodations?type=cabine' },
      { label: 'Glamping', href: '/accommodations?type=glamping' },
      { label: 'Dômes', href: '/accommodations?type=dome' },
    ],
  },
  {
    title: 'Assistance',
    links: [
      { label: "Centre d'aide", href: '/help' },
      { label: 'Assistance par chat en direct', href: 'https://wa.me/2250705654775' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contactez-nous', href: '/contact' },
    ],
  },
];

// Logos affichés dans le footer (marketing). NB : MTN MoMo et Moov Money (Flooz)
// sont montrés ici comme moyens « à venir » mais NE SONT PAS encore proposés au
// checkout — à configurer plus tard côté passerelle Malia Pay (cf. PaymentController
// ::createPaymentLink $channelMap et PaymentMethodSeeder).
const PAYMENT_LOGOS = [
  { src: '/images/payment-methods/visa_mastercard.png', alt: 'Visa / Mastercard' },
  { src: '/images/payment-methods/wave.png', alt: 'Wave' },
  { src: '/images/payment-methods/orange-ci.png', alt: 'Orange Money' },
  { src: '/images/payment-methods/mtn_momo.png', alt: 'MTN MoMo' },
  { src: '/images/payment-methods/moov.png', alt: 'Moov Money (Flooz)' },
  { src: '/images/payment-methods/djamo.jpeg', alt: 'Djamo' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-gray-300 mt-auto">
      <div className="container mx-auto px-4 md:px-8 py-14 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Marque */}
          <div className="lg:col-span-2 max-w-sm">
            <Logo href="/" variant="white" size="md" />
            <p className="text-sm mt-4 mb-6 text-gray-400">
              Nous vous aidons à trouver et réserver le séjour idéal — hôtels, résidences et villas — en toute
              simplicité, en toute confiance et avec les meilleures offres.
            </p>
            <p className="text-primary font-semibold text-sm mb-3">Téléchargez notre application</p>
            <div className="flex gap-3">
              <a href="#" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 transition-colors">
                <Apple className="w-6 h-6" />
                <span className="text-left leading-tight">
                  <span className="block text-[10px] text-gray-400">Télécharger sur</span>
                  <span className="block text-sm font-semibold text-white">App Store</span>
                </span>
              </a>
              <a href="#" className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-xl px-3 py-2 transition-colors">
                <Play className="w-6 h-6" />
                <span className="text-left leading-tight">
                  <span className="block text-[10px] text-gray-400">Disponible sur</span>
                  <span className="block text-sm font-semibold text-white">Google Play</span>
                </span>
              </a>
            </div>
          </div>

          {/* Colonnes de liens */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-primary font-semibold mb-4">{col.title}</h3>
              <ul className="space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-gray-400 hover:text-white transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact */}
          <div>
            <h3 className="text-primary font-semibold mb-4">Entrez en contact</h3>
            <ul className="space-y-2.5 text-sm text-gray-400">
              <li><a href="tel:+2250706402929" className="hover:text-white transition-colors">+225 07 06 40 29 29</a></li>
              <li><a href="mailto:support@bosejour.ci" className="hover:text-white transition-colors">support@bosejour.ci</a></li>
            </ul>
            <div className="flex gap-3 mt-4">
              {[Facebook, Instagram, Youtube, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-full bg-white/10 hover:bg-primary flex items-center justify-center transition-colors" aria-label="Réseau social">
                  <Icon className="w-4 h-4 text-white" />
                </a>
              ))}
              <a
                href="https://wa.me/2250705654775"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center transition-transform hover:scale-110"
                aria-label="Nous écrire sur WhatsApp"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/payment-methods/whatsapp.png" alt="WhatsApp" className="w-9 h-9 object-contain" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">© {currentYear} bo séjour. Tous droits réservés.</p>
          <div className="flex flex-wrap items-center gap-2">
            {PAYMENT_LOGOS.map((logo) => (
              <span key={logo.src} className="h-8 px-2 rounded-md bg-white flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo.src} alt={logo.alt} className="h-5 w-auto object-contain" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
