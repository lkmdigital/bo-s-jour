'use client';

import { useState } from 'react';
import { Search, Mail, ArrowRight, Heart } from 'lucide-react';
import { Button, Badge, PromoBadge, VerifiedBadge, Input, Card } from '@/components/ui';
import Logo from '@/components/common/Logo';

const swatches = [
  { name: 'Rouge (CTA)', hex: '#FF0000', text: 'text-white' },
  { name: 'Noir', hex: '#000000', text: 'text-white' },
  { name: 'Gris-vert', hex: '#4B5F5A', text: 'text-white' },
  { name: 'Gris foncé', hex: '#343434', text: 'text-white' },
  { name: 'Beige', hex: '#F7E8C6', text: 'text-black' },
  { name: 'Rose accent', hex: '#EE233C', text: 'text-white' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-black border-b-2 border-primary inline-block pb-1">
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

export default function DesignSystemPage() {
  const [email, setEmail] = useState('');

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-black">Design System — bo séjour</h1>
        <p className="font-slogan text-2xl text-primary">Votre séjour commence ici…</p>
      </header>

      <Section title="Logo">
        <div className="flex flex-wrap items-center gap-8">
          <div className="p-6 bg-white border rounded-2xl">
            <Logo href={undefined} variant="color" size="lg" />
          </div>
          <div className="p-6 bg-black rounded-2xl">
            <Logo href={undefined} variant="white" size="lg" />
          </div>
          <div className="p-6 bg-white border rounded-2xl">
            <Logo href={undefined} useImage={false} />
          </div>
        </div>
      </Section>

      <Section title="Couleurs">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {swatches.map((s) => (
            <div key={s.hex} className="rounded-2xl overflow-hidden shadow-md">
              <div className={`h-20 flex items-end p-2 ${s.text}`} style={{ background: s.hex }}>
                <span className="text-xs font-semibold">{s.hex}</span>
              </div>
              <div className="p-2 text-xs bg-white text-black">{s.name}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Boutons">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Réserver</Button>
            <Button variant="secondary">Détails</Button>
            <Button variant="outline">Annuler</Button>
            <Button variant="ghost">Ignorer</Button>
            <Button variant="danger">Supprimer</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Petit</Button>
            <Button size="md">Moyen</Button>
            <Button size="lg">Grand</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button leftIcon={<Search className="h-4 w-4" />}>Rechercher</Button>
            <Button rightIcon={<ArrowRight className="h-4 w-4" />}>Continuer</Button>
            <Button loading>Paiement…</Button>
            <Button variant="outline" leftIcon={<Heart className="h-4 w-4" />}>Favori</Button>
            <Button href="/">Lien bouton</Button>
          </div>
          <div className="max-w-xs">
            <Button fullWidth variant="primary">Payer maintenant</Button>
          </div>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap items-center gap-3">
          <PromoBadge />
          <PromoBadge>-20 %</PromoBadge>
          <VerifiedBadge />
          <Badge variant="pending" icon>En attente</Badge>
          <Badge variant="success" icon>Confirmée</Badge>
          <Badge variant="danger" icon>Annulée</Badge>
          <Badge variant="warning" icon>No Show</Badge>
          <Badge variant="info" icon>Sur demande</Badge>
          <Badge variant="neutral">Terminée</Badge>
        </div>
      </Section>

      <Section title="Champs de saisie">
        <div className="grid sm:grid-cols-2 gap-6 max-w-2xl">
          <Input
            label="Adresse e-mail"
            type="email"
            placeholder="votre@email.com"
            leftIcon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            hint="On ne partagera jamais votre e-mail."
            required
          />
          <Input
            label="Destination"
            placeholder="Abidjan, Grand-Bassam…"
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Input
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            error="Le mot de passe est trop court."
          />
          <Input label="Sans icône" placeholder="Texte simple" />
        </div>
      </Section>

      <Section title="Cartes">
        <div className="grid sm:grid-cols-3 gap-6">
          <Card interactive>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-black">Hôtel Ivoire</h3>
              <PromoBadge>-15 %</PromoBadge>
            </div>
            <p className="text-sm text-gray-600">Abidjan · Cocody</p>
            <p className="mt-3 text-lg font-bold text-primary">45 000 FCFA<span className="text-sm font-normal text-gray-500"> / nuit</span></p>
          </Card>
          <Card>
            <VerifiedBadge />
            <p className="mt-3 text-sm text-gray-600">Établissement vérifié par l'équipe bo séjour.</p>
          </Card>
          <Card padding="lg" className="bg-black text-white">
            <h3 className="font-bold">Carte sombre</h3>
            <p className="text-sm text-gray-300 mt-2">Variante fond noir (30 % de la charte).</p>
            <Button variant="primary" size="sm" className="mt-4">Action</Button>
          </Card>
        </div>
      </Section>
    </div>
  );
}
