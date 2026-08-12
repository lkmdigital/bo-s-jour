'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Check, User, Building2, ShieldCheck, Lock, Calendar, Users, ChevronRight, ChevronLeft, Mail, Phone, LogIn,
  MessageCircle, Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useAppSettingsStore } from '@/stores/appSettingsStore';
import { formatPrice, resolveImageUrl, cn } from '@/lib/utils';
import { Input } from '@/components/ui';
import DateSelector from '@/components/booking/DateSelector';

interface PaymentOptionItem { label: string; amount: number; balance_at_hotel?: number; description?: string; }
interface PriceQuote {
  nights: number; total: number;
  effective_price_per_night?: number;
  cancellation_policy_hours?: number;
  payment_options?: { full_only: boolean; reason: string | null; options: { full: PaymentOptionItem; guarantee?: PaymentOptionItem } };
}

interface Props {
  accommodationId: number;
  accommodationName: string;
  accommodationImage?: string;
  city?: string;
  pricePerNight: number;
  roomId?: number;
  roomName?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: number;
  cancellationPolicyHours?: number | null;
}

const STEPS = ['Récapitulatif', 'Compte', 'Voyageur', 'Coordonnées', 'Vérification'];

function policyLabel(h?: number | null) {
  const v = typeof h === 'number' ? h : 48;
  if (v === 0) return 'Stricte (non remboursable)';
  if (v <= 24) return `Modérée (annulation gratuite jusqu'à ${v}h avant)`;
  return `Flexible (annulation gratuite jusqu'à ${v}h avant)`;
}

export default function BookingWizard(props: Props) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { whatsappVerificationEnabled } = useAppSettingsStore();

  const [step, setStep] = useState(0);
  const [checkIn, setCheckIn] = useState(props.initialCheckIn || '');
  const [checkOut, setCheckOut] = useState(props.initialCheckOut || '');
  const [guests, setGuests] = useState(props.initialGuests || 1);
  const [editingDates, setEditingDates] = useState(!props.initialCheckIn || !props.initialCheckOut);

  const [account, setAccount] = useState<'guest' | 'account' | null>(isAuthenticated ? 'account' : null);
  const [travelerType, setTravelerType] = useState<'individual' | 'corporate'>('individual');

  // Coordonnées voyageur
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [residenceCountry, setResidenceCountry] = useState('Côte d\'Ivoire');
  const [residenceCity, setResidenceCity] = useState('');
  // Entreprise (corporate)
  const [companyName, setCompanyName] = useState('');
  const [companyVat, setCompanyVat] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyBillingEmail, setCompanyBillingEmail] = useState('');
  const [deferredPayment, setDeferredPayment] = useState(false);

  // Vérification WhatsApp du numéro (brief Étape 8) — n'apparaît que si l'admin
  // a configuré l'intégration WhatsApp ; sinon on ne simule pas une étape inopérante.
  const [waOtpSent, setWaOtpSent] = useState(false);
  const [waCode, setWaCode] = useState('');
  const [waVerifiedPhone, setWaVerifiedPhone] = useState<string | null>(null);
  const [waBusy, setWaBusy] = useState(false);
  const [waError, setWaError] = useState<string | null>(null);
  const waVerified = waVerifiedPhone !== null && waVerifiedPhone === phone.trim();

  const sendWaCode = async () => {
    setWaError(null);
    setWaBusy(true);
    try {
      await api.post('/booking/whatsapp-otp/send', { phone: phone.trim() });
      setWaOtpSent(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setWaError(e.response?.data?.message || "Impossible d'envoyer le code. Vérifiez le numéro.");
    } finally {
      setWaBusy(false);
    }
  };

  const verifyWaCode = async () => {
    setWaError(null);
    setWaBusy(true);
    try {
      await api.post('/booking/whatsapp-otp/verify', { phone: phone.trim(), code: waCode });
      setWaVerifiedPhone(phone.trim());
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setWaError(e.response?.data?.message || 'Code incorrect.');
    } finally {
      setWaBusy(false);
    }
  };

  const [cgv, setCgv] = useState(false);
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDates = !!(checkIn && checkOut);

  // Devis tarifaire (récap 1ère nuitée)
  useEffect(() => {
    if (!hasDates) { setQuote(null); return; }
    api.get(`/accommodations/${props.accommodationId}/price-preview?check_in=${checkIn}&check_out=${checkOut}`)
      .then((r) => setQuote(r.data))
      .catch(() => setQuote(null));
  }, [checkIn, checkOut, props.accommodationId, hasDates]);

  const guarantee = quote?.payment_options?.options?.guarantee;
  const full = quote?.payment_options?.options?.full;
  const onlineNow = guarantee?.amount ?? full?.amount;
  const balance = guarantee?.balance_at_hotel;

  const canNext = useMemo(() => {
    if (step === 0) return hasDates;
    if (step === 1) return account !== null;
    if (step === 2) return true;
    if (step === 3) {
      let base = !!(firstName.trim() && lastName.trim() && email.trim() && phone.trim());
      if (whatsappVerificationEnabled) base = base && waVerified;
      if (travelerType === 'corporate') return base && !!(companyName.trim() && companyBillingEmail.trim());
      return base;
    }
    return true;
  }, [step, hasDates, account, firstName, lastName, email, phone, travelerType, companyName, companyBillingEmail, whatsappVerificationEnabled, waVerified]);

  const goNext = () => {
    // Si connecté, on saute l'étape "Compte"
    if (step === 0 && isAuthenticated) { setStep(2); return; }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goPrev = () => {
    if (step === 2 && isAuthenticated) { setStep(0); return; }
    setStep((s) => Math.max(0, s - 1));
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        accommodation_id: props.accommodationId,
        room_id: props.roomId || null,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        traveler_type: travelerType,
        residence_country: residenceCountry || null,
        residence_city: residenceCity || null,
      };
      if (!isAuthenticated) {
        payload.name = `${firstName} ${lastName}`.trim();
        payload.email = email;
        payload.phone = phone;
      }
      if (travelerType === 'corporate') {
        payload.company_name = companyName;
        payload.company_vat = companyVat || null;
        payload.company_address = companyAddress || null;
        payload.company_billing_email = companyBillingEmail;
        payload.deferred_payment = deferredPayment;
      }
      const res = await api.post('/bookings', payload);
      const id = res.data?.id;
      // Paiement différé Corporate : la réservation est validée sur facture
      if (travelerType === 'corporate' && deferredPayment) {
        router.push(`/bookings/${id}?corporate=1`);
      } else {
        router.push(`/bookings/${id}/payment`);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Erreur lors de la réservation. Veuillez réessayer.');
      setSubmitting(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
      {/* Colonne étapes */}
      <div>
        {/* Stepper */}
        <ol className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
          {STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={label} className="flex items-center gap-2 flex-shrink-0">
                <span className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                  done ? 'bg-primary text-white' : active ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500')}>
                  {done ? <Check className="w-4 h-4" /> : i + 1}
                </span>
                <span className={cn('text-sm whitespace-nowrap', active ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500')}>{label}</span>
                {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300" />}
              </li>
            );
          })}
        </ol>

        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-[#EE233C] text-sm px-4 py-3">{error}</div>}

        <div className="card">
          {/* Étape 0 — Récapitulatif */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Votre séjour</h2>
              {editingDates ? (
                <>
                  <DateSelector
                    onDatesSelected={(ci, co, g) => { setCheckIn(ci.toISOString().split('T')[0]); setCheckOut(co.toISOString().split('T')[0]); setGuests(g); setEditingDates(false); }}
                    initialCheckIn={checkIn ? new Date(checkIn) : undefined}
                    initialCheckOut={checkOut ? new Date(checkOut) : undefined}
                    initialGuests={guests}
                  />
                </>
              ) : (
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-primary" /> {checkIn} → {checkOut}</div>
                  <div className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-primary" /> {guests} voyageur{guests > 1 ? 's' : ''}</div>
                  <button onClick={() => setEditingDates(true)} className="text-sm text-primary font-medium hover:underline">Modifier</button>
                </div>
              )}
              <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 text-sm text-gray-700 dark:text-gray-300">
                <p className="font-semibold text-gray-900 dark:text-white mb-1">Garantie de la première nuitée</p>
                Conformément à la politique de l'établissement, le paiement de la première nuitée est requis pour garantir votre réservation.
              </div>
            </div>
          )}

          {/* Étape 1 — Compte */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Comment souhaitez-vous continuer ?</h2>
              <button onClick={() => setAccount('guest')}
                className={cn('w-full text-left rounded-2xl border-2 p-4 transition-colors', account === 'guest' ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50')}>
                <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Continuer sans compte <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary text-white">Recommandé</span></p>
                <p className="text-sm text-gray-500 mt-1 ml-7">Réservez rapidement. Vous pourrez créer votre espace après, vos infos seront préremplies.</p>
              </button>
              <div className="flex items-center gap-3">
                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" /><span className="text-xs text-gray-400">ou</span><div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
              </div>
              <Link href={`/auth/login?redirect=${typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname + window.location.search) : ''}`}
                className="w-full text-left rounded-2xl border-2 border-gray-200 dark:border-gray-700 p-4 hover:border-primary/50 transition-colors flex items-center gap-2">
                <LogIn className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                <span><span className="font-semibold text-gray-900 dark:text-white block">Se connecter</span><span className="text-sm text-gray-500">Retrouvez vos infos et vos réservations.</span></span>
              </Link>
            </div>
          )}

          {/* Étape 2 — Type de voyageur */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vous voyagez…</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {([
                  { key: 'individual', icon: User, title: 'À titre personnel', desc: 'Voyageur particulier. Facture à votre nom.' },
                  { key: 'corporate', icon: Building2, title: 'Pour une entreprise', desc: 'Voyageur corporate. Facture professionnelle.' },
                ] as const).map((o) => {
                  const Icon = o.icon;
                  const active = travelerType === o.key;
                  return (
                    <button key={o.key} onClick={() => setTravelerType(o.key)}
                      className={cn('text-left rounded-2xl border-2 p-4 transition-colors', active ? 'border-primary bg-primary/5' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50')}>
                      <Icon className={cn('w-6 h-6 mb-2', active ? 'text-primary' : 'text-gray-500')} />
                      <p className="font-semibold text-gray-900 dark:text-white">{o.title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{o.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Étape 3 — Coordonnées */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vos coordonnées</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Prénom(s)" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                <Input label="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                <div>
                  <Input label="Téléphone / WhatsApp" leftIcon={<Phone className="w-4 h-4" />} value={phone}
                    onChange={(e) => { setPhone(e.target.value); setWaOtpSent(false); setWaCode(''); setWaError(null); }}
                    placeholder="+225 07 00 00 00 00" required hint="Utilisé pour la confirmation WhatsApp" />

                  {whatsappVerificationEnabled && phone.trim() && (
                    <div className="mt-2">
                      {waVerified ? (
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1.5">
                          <Check className="w-4 h-4" /> Numéro WhatsApp vérifié
                        </p>
                      ) : !waOtpSent ? (
                        <button type="button" onClick={sendWaCode} disabled={waBusy}
                          className="text-sm text-primary font-medium hover:underline inline-flex items-center gap-1.5 disabled:opacity-50">
                          {waBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5" />}
                          Vérifier ce numéro par WhatsApp
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input value={waCode} onChange={(e) => setWaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            inputMode="numeric" maxLength={6} placeholder="Code reçu"
                            className="w-28 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm tracking-widest outline-none focus:border-primary" />
                          <button type="button" onClick={verifyWaCode} disabled={waBusy || waCode.length !== 6}
                            className="text-sm text-primary font-medium hover:underline disabled:opacity-50 inline-flex items-center gap-1">
                            {waBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Vérifier
                          </button>
                          <button type="button" onClick={sendWaCode} disabled={waBusy} className="text-xs text-gray-400 hover:underline">Renvoyer</button>
                        </div>
                      )}
                      {waError && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{waError}</p>}
                    </div>
                  )}
                </div>
                <Input label="E-mail" type="email" leftIcon={<Mail className="w-4 h-4" />} value={email} onChange={(e) => setEmail(e.target.value)} required />
                <Input label="Pays de résidence" value={residenceCountry} onChange={(e) => setResidenceCountry(e.target.value)} />
                <Input label="Ville de résidence" value={residenceCity} onChange={(e) => setResidenceCity(e.target.value)} />
              </div>

              {travelerType === 'corporate' && (
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Informations entreprise</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Input label="Raison sociale" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                    <Input label="N° TVA / Contribuable" value={companyVat} onChange={(e) => setCompanyVat(e.target.value)} />
                    <Input label="Adresse de l'entreprise" containerClassName="sm:col-span-2" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
                    <Input label="E-mail de facturation" type="email" value={companyBillingEmail} onChange={(e) => setCompanyBillingEmail(e.target.value)} required />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={deferredPayment} onChange={(e) => setDeferredPayment(e.target.checked)} className="accent-[#FF0000]" />
                    Paiement par mon entreprise (facturation différée, sans paiement immédiat)
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Étape 4 — Vérification */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Vérification & sécurité</h2>
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {[
                  ['Établissement', props.accommodationName + (props.roomName ? ` · ${props.roomName}` : '')],
                  ['Dates', `${checkIn} → ${checkOut} (${quote?.nights ?? ''} nuit${(quote?.nights ?? 0) > 1 ? 's' : ''})`],
                  ['Voyageurs', `${guests}`],
                  ['Voyageur', travelerType === 'corporate' ? `Corporate — ${companyName}` : `Particulier — ${firstName} ${lastName}`],
                  ['Contact', `${email} · ${phone}`],
                  ['Politique d\'annulation', policyLabel(quote?.cancellation_policy_hours ?? props.cancellationPolicyHours)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 p-3 text-sm">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-900 dark:text-white text-right">{v}</span>
                  </div>
                ))}
              </div>

              {/* Bandeau sécurité */}
              <div className="rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 flex gap-3">
                <ShieldCheck className="w-6 h-6 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-300">
                  <strong>Paiement sécurisé.</strong> Si l'établissement n'accepte pas votre demande, vous serez intégralement remboursé automatiquement sous 24h. Vous n'avez aucun risque financier.
                </p>
              </div>

              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={cgv} onChange={(e) => setCgv(e.target.checked)} className="accent-[#FF0000] mt-0.5" />
                <span>J'ai lu et j'accepte les <Link href="/terms" className="text-primary hover:underline">conditions générales de vente</Link>. Conformément à la politique de l'établissement, la première nuitée est garantie par le paiement en ligne.</span>
              </label>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-100 dark:border-gray-700">
            <button onClick={goPrev} disabled={step === 0} className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:text-primary disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" /> Retour
            </button>
            {step < STEPS.length - 1 ? (
              <button onClick={goNext} disabled={!canNext} className="btn-primary inline-flex items-center gap-1 disabled:opacity-50">
                Continuer <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={submit} disabled={!cgv || submitting} className="btn-primary disabled:opacity-50">
                {submitting ? 'Traitement…' : travelerType === 'corporate' && deferredPayment ? 'Valider la réservation' : 'Procéder au paiement'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Récap sticky */}
      <div className="lg:sticky lg:top-28 space-y-3">
        <div className="card !p-0 overflow-hidden">
          {props.accommodationImage && (
            <div className="relative h-36">
              <Image src={resolveImageUrl(props.accommodationImage) || props.accommodationImage} alt={props.accommodationName} fill className="object-cover" sizes="360px" />
            </div>
          )}
          <div className="p-4 space-y-3">
            <div>
              <p className="font-bold text-gray-900 dark:text-white">{props.accommodationName}</p>
              {props.city && <p className="text-sm text-gray-500">{props.city}</p>}
            </div>
            {quote ? (
              <div className="space-y-1.5 text-sm border-t border-gray-100 dark:border-gray-700 pt-3">
                <div className="flex justify-between"><span className="text-gray-500">{quote.nights} nuit{quote.nights > 1 ? 's' : ''}</span><span className="text-gray-900 dark:text-white">{formatPrice(quote.total)} FCFA</span></div>
                <div className="flex justify-between font-bold"><span>Total</span><span>{formatPrice(quote.total)} FCFA</span></div>
                {onlineNow != null && (
                  <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 mt-2">
                    <p className="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1"><Lock className="w-3 h-3 text-primary" /> En ligne : {formatPrice(onlineNow)} FCFA</p>
                    {balance != null && <p className="text-[11px] text-gray-600 dark:text-gray-400">1ère nuitée garantie — solde {formatPrice(balance)} FCFA à l'arrivée.</p>}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-3">Sélectionnez vos dates pour voir le détail.</p>
            )}
          </div>
        </div>
        <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> Remboursement 24h si l'établissement refuse
        </p>
      </div>
    </div>
  );
}
