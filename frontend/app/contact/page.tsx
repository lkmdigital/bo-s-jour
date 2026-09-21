'use client';

import { useState } from 'react';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import SupportShell from '@/components/common/SupportShell';
import api from '@/lib/api';
import { SUPPORT } from '@/lib/supportContent';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      await api.post('/contact', form);
      setStatus('sent');
    } catch (err: any) {
      setStatus('idle');
      setError(
        err.response?.status === 429
          ? 'Trop de messages envoyés. Réessayez plus tard ou écrivez-nous sur WhatsApp.'
          : err.response?.data?.message || err.response?.data?.errors?.message?.[0] || "L'envoi a échoué. Écrivez-nous sur WhatsApp ou par e-mail."
      );
    }
  };

  const field = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary';

  return (
    <SupportShell title="Contactez-nous" intro="Une question sur une réservation, un paiement ou votre établissement ? Écrivez-nous, nous vous répondons rapidement.">
      <div className="grid md:grid-cols-5 gap-8">
        <div className="md:col-span-2 space-y-4">
          <a href={SUPPORT.whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:border-primary transition-colors">
            <MessageCircle className="w-6 h-6 text-primary shrink-0" />
            <div><p className="font-semibold">WhatsApp</p><p className="text-sm text-gray-600 dark:text-gray-400">Assistance en direct</p></div>
          </a>
          <a href={SUPPORT.phoneHref} className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:border-primary transition-colors">
            <Phone className="w-6 h-6 text-primary shrink-0" />
            <div><p className="font-semibold">Téléphone</p><p className="text-sm text-gray-600 dark:text-gray-400">{SUPPORT.phone}</p></div>
          </a>
          <a href={SUPPORT.emailHref} className="flex items-center gap-3 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:border-primary transition-colors">
            <Mail className="w-6 h-6 text-primary shrink-0" />
            <div><p className="font-semibold">E-mail</p><p className="text-sm text-gray-600 dark:text-gray-400">{SUPPORT.email}</p></div>
          </a>
        </div>

        <div className="md:col-span-3 card">
          {status === 'sent' ? (
            <div className="text-center py-8">
              <p className="text-xl font-bold mb-2">Message envoyé</p>
              <p className="text-gray-600 dark:text-gray-400">Merci ! Nous vous répondrons rapidement à l&apos;adresse indiquée.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="c-name" className="block text-sm font-medium mb-1.5">Nom</label>
                  <input id="c-name" value={form.name} onChange={set('name')} required maxLength={120} className={field} />
                </div>
                <div>
                  <label htmlFor="c-email" className="block text-sm font-medium mb-1.5">E-mail</label>
                  <input id="c-email" type="email" value={form.email} onChange={set('email')} required className={field} />
                </div>
              </div>
              <div>
                <label htmlFor="c-subject" className="block text-sm font-medium mb-1.5">Sujet <span className="text-gray-400 font-normal">(facultatif)</span></label>
                <input id="c-subject" value={form.subject} onChange={set('subject')} maxLength={150} className={field} />
              </div>
              <div>
                <label htmlFor="c-message" className="block text-sm font-medium mb-1.5">Message</label>
                <textarea id="c-message" value={form.message} onChange={set('message')} required minLength={10} maxLength={3000} rows={6} className={field} />
              </div>
              {/* Champ piège anti-robot : invisible pour les humains */}
              <input type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} className="hidden" aria-hidden="true" />

              {error && <p className="text-sm text-red-600">{error}</p>}
              <button type="submit" disabled={status === 'sending'} className="btn-primary w-full disabled:opacity-50">
                {status === 'sending' ? 'Envoi…' : 'Envoyer le message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </SupportShell>
  );
}
