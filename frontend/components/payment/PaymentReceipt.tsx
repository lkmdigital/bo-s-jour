'use client';

import { useState, useEffect } from 'react';
import { Download, Printer, FileText, CheckCircle, Calendar, CreditCard, User, Building2, MapPin, Share2, Copy, ArrowLeft } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '@/lib/api';
import Link from 'next/link';

interface Payment {
  id: number;
  amount: number;
  status: string;
  purpose: 'deposit' | 'balance';
  payment_method: string;
  transaction_id?: string;
  payment_reference?: string;
  paid_at?: string;
  created_at: string;
}

interface PaymentReceiptProps {
  bookingId: number;
  booking: {
    id: number;
    booking_number?: string | null;
    check_in: string;
    check_out: string;
    guests: number;
    total_price: number;
    accommodation: {
      id: number;
      name: string;
      city: string;
      address?: string;
    };
    user?: {
      id: number;
      name: string;
      email: string;
      phone?: string;
    };
  };
  userRole: 'user' | 'host';
  payments?: Payment[];
}

export default function PaymentReceipt({ bookingId, booking, userRole, payments: initialPayments }: PaymentReceiptProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments || []);
  const [loading, setLoading] = useState(!initialPayments);
  const [copied, setCopied] = useState(false);
  // N° de réservation stable (facturation/support), à défaut l'ID interne pour
  // les réservations antérieures à l'introduction du champ.
  const bookingReference = booking.booking_number || `#${booking.id}`;

  useEffect(() => {
    if (!initialPayments) {
      fetchPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      // Récupérer les paiements depuis l'API
      const response = await api.get(`/bookings/${bookingId}`);
      const bookingData = response.data;
      
      // Si l'API retourne les paiements directement (relation payments)
      if (bookingData.payments && Array.isArray(bookingData.payments)) {
        setPayments(bookingData.payments.filter((p: Payment) => p.status === 'completed'));
      } 
      // Si l'API retourne un seul paiement (relation payment)
      else if (bookingData.payment && bookingData.payment.status === 'completed') {
        setPayments([bookingData.payment]);
      } 
      // Sinon, essayer de récupérer depuis une route dédiée
      else {
        try {
          const paymentsResponse = await api.get(`/bookings/${bookingId}/payments`);
          if (Array.isArray(paymentsResponse.data)) {
            setPayments(paymentsResponse.data.filter((p: Payment) => p.status === 'completed'));
          } else if (paymentsResponse.data.payments) {
            setPayments(paymentsResponse.data.payments.filter((p: Payment) => p.status === 'completed'));
          } else {
            setPayments([]);
          }
        } catch (err) {
          // Si pas de route dédiée, on utilise les données de la réservation
          setPayments([]);
        }
      }
    } catch (err) {
      console.error('Erreur lors du chargement des paiements:', err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const receiptContent = generateReceiptHTML();
    const blob = new Blob([receiptContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `recu-paiement-${(booking.booking_number || booking.id).toString().replace(/[^a-zA-Z0-9-]/g, '')}-${format(new Date(), 'yyyy-MM-dd')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    const receiptUrl = `${window.location.origin}/bookings/${booking.id}?receipt=true`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reçu de paiement - Réservation ${bookingReference}`,
          text: `Reçu de paiement pour la réservation ${bookingReference} - ${booking.accommodation.name}`,
          url: receiptUrl,
        });
      } catch (err) {
        // L'utilisateur a annulé le partage
        console.log('Partage annulé');
      }
    } else {
      // Fallback: copier le lien
      handleCopyLink(receiptUrl);
    }
  };

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback pour navigateurs plus anciens
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const generateReceiptHTML = () => {
    const completedPayments = payments.filter(p => p.status === 'completed');
    const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reçu de paiement - Réservation ${bookingReference}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
    body {
      font-family: 'DM Sans', system-ui, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #C1121F;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 28px;
      color: #C1121F;
      font-weight: bold;
    }
    .header p {
      margin: 5px 0;
      color: #666;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      border-bottom: 1px solid #ddd;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .info-label {
      font-weight: bold;
      color: #666;
    }
    .total {
      font-size: 20px;
      font-weight: bold;
      color: #C1121F;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #C1121F;
    }
    .payment-item {
      background: #f5f5f5;
      padding: 15px;
      margin-bottom: 10px;
      border-radius: 5px;
    }
    @media print {
      body { 
        padding: 0; 
        margin: 0;
      }
      .no-print { display: none !important; }
      .header {
        page-break-after: avoid;
      }
      .section {
        page-break-inside: avoid;
      }
      .payment-item {
        page-break-inside: avoid;
      }
    }
    @page {
      margin: 2cm;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>REÇU DE PAIEMENT</h1>
    <p><strong>Bosejour</strong> - <span style="font-family: 'Brush Script MT', 'Brush Script Std', cursive; font-style: italic;">Votre séjour commence ici...</span></p>
    <p style="font-size: 12px; color: #666; margin-top: 5px;">Plateforme de réservation d&apos;hébergements en Côte d&apos;Ivoire</p>
  </div>

  <div class="section">
    <h2>Informations de la réservation</h2>
    <div class="info-row">
      <span class="info-label">Numéro de réservation:</span>
      <span>${bookingReference}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Hébergement:</span>
      <span>${booking.accommodation.name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Ville:</span>
      <span>${booking.accommodation.city}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Dates:</span>
      <span>${format(new Date(booking.check_in), 'dd MMMM yyyy', { locale: fr })} - ${format(new Date(booking.check_out), 'dd MMMM yyyy', { locale: fr })}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Nombre de voyageurs:</span>
      <span>${booking.guests}</span>
    </div>
  </div>

  ${userRole === 'host' && booking.user ? `
  <div class="section">
    <h2>Informations du client</h2>
    <div class="info-row">
      <span class="info-label">Nom:</span>
      <span>${booking.user.name}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Email:</span>
      <span>${booking.user.email}</span>
    </div>
    ${booking.user.phone ? `
    <div class="info-row">
      <span class="info-label">Téléphone:</span>
      <span>${booking.user.phone}</span>
    </div>
    ` : ''}
  </div>
  ` : ''}

  <div class="section">
    <h2>Détails des paiements</h2>
    ${completedPayments.map((payment, index) => `
    <div class="payment-item">
      <div class="info-row">
        <span class="info-label">Paiement #${index + 1}</span>
        <span>${formatPrice(payment.amount)} FCFA</span>
      </div>
      <div class="info-row">
        <span class="info-label">Type:</span>
        <span>${payment.purpose === 'deposit' ? 'Acompte' : 'Solde'}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Méthode:</span>
        <span>${payment.payment_method || 'Non spécifiée'}</span>
      </div>
      ${payment.transaction_id ? `
      <div class="info-row">
        <span class="info-label">Transaction ID:</span>
        <span>${payment.transaction_id}</span>
      </div>
      ` : ''}
      ${payment.payment_reference ? `
      <div class="info-row">
        <span class="info-label">Référence:</span>
        <span>${payment.payment_reference}</span>
      </div>
      ` : ''}
      ${payment.paid_at ? `
      <div class="info-row">
        <span class="info-label">Date de paiement:</span>
        <span>${format(new Date(payment.paid_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</span>
      </div>
      ` : ''}
    </div>
    `).join('')}
  </div>

  <div class="section">
    <div class="info-row">
      <span class="info-label">Montant total de la réservation:</span>
      <span>${formatPrice(booking.total_price)} FCFA</span>
    </div>
    <div class="info-row">
      <span class="info-label">Montant total payé:</span>
      <span>${formatPrice(totalPaid)} FCFA</span>
    </div>
    <div class="total">
      <div class="info-row">
        <span>Solde restant:</span>
        <span>${formatPrice(booking.total_price - totalPaid)} FCFA</span>
      </div>
    </div>
  </div>

  <div style="margin-top: 40px; text-align: center; color: #666; font-size: 12px; border-top: 1px solid #ddd; padding-top: 20px;">
    <p><strong>Bosejour</strong> - <span style="font-family: 'Brush Script MT', 'Brush Script Std', cursive; font-style: italic;">Votre séjour commence ici...</span></p>
    <p>Reçu généré le ${format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
    <p style="font-weight: bold; margin-top: 10px;">Ce document fait foi de paiement</p>
    <p style="margin-top: 5px; font-size: 11px;">Pour toute question, contactez le support client</p>
  </div>
</body>
</html>
    `;
  };

  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (completedPayments.length === 0) {
    return null;
  }

  return (
    <div className="card print:shadow-none border-2 border-primary/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Reçu de paiement</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Réservation {bookingReference} • {format(new Date(), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex gap-2 no-print flex-wrap">
          <button
            onClick={handlePrint}
            className="btn-primary flex items-center gap-2 text-sm"
            title="Imprimer le reçu"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Imprimer</span>
          </button>
          <button
            onClick={handleDownload}
            className="btn-outline flex items-center gap-2 text-sm"
            title="Télécharger le reçu"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Télécharger</span>
          </button>
          <button
            onClick={handleShare}
            className="btn-outline flex items-center gap-2 text-sm"
            title="Partager le reçu"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Partager</span>
          </button>
          <button
            onClick={() => handleCopyLink(window.location.href)}
            className="btn-outline flex items-center gap-2 text-sm"
            title="Copier le lien"
          >
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">{copied ? 'Copié !' : 'Copier le lien'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Informations de la réservation */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Hébergement
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Nom:</span>
              <span className="font-medium">{booking.accommodation.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Ville:
              </span>
              <span className="font-medium">{booking.accommodation.city}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Dates:
              </span>
              <span className="font-medium text-right">
                {format(new Date(booking.check_in), 'dd MMM yyyy', { locale: fr })} - {' '}
                {format(new Date(booking.check_out), 'dd MMM yyyy', { locale: fr })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Voyageurs:</span>
              <span className="font-medium">{booking.guests}</span>
            </div>
          </div>
        </div>

        {/* Informations du client (pour les hôtes) */}
        {userRole === 'host' && booking.user && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Client
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Nom:</span>
                <span className="font-medium">{booking.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Email:</span>
                <span className="font-medium break-all">{booking.user.email}</span>
              </div>
              {booking.user.phone && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Téléphone:</span>
                  <span className="font-medium">{booking.user.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Détails des paiements */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Paiements effectués
          </h4>
          <div className="space-y-3">
            {completedPayments.map((payment, index) => (
              <div
                key={payment.id}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="font-semibold">
                      Paiement #{index + 1} - {payment.purpose === 'deposit' ? 'Acompte' : 'Solde'}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {formatPrice(payment.amount)} FCFA
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Méthode:</span>
                    <span className="ml-2 font-medium">{payment.payment_method || 'Non spécifiée'}</span>
                  </div>
                  {payment.transaction_id && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>
                      <span className="ml-2 font-medium font-mono text-xs">{payment.transaction_id}</span>
                    </div>
                  )}
                  {payment.payment_reference && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Référence:</span>
                      <span className="ml-2 font-medium font-mono text-xs">{payment.payment_reference}</span>
                    </div>
                  )}
                  {payment.paid_at && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Date:</span>
                      <span className="ml-2 font-medium">
                        {format(new Date(payment.paid_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Récapitulatif */}
        <div className="pt-4 border-t-2 border-gray-300 dark:border-gray-600">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Montant total de la réservation:</span>
              <span className="font-medium">{formatPrice(booking.total_price)} FCFA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Montant total payé:</span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatPrice(totalPaid)} FCFA
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
              <span>Solde restant:</span>
              <span className={booking.total_price - totalPaid > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}>
                {formatPrice(booking.total_price - totalPaid)} FCFA
              </span>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="text-xs text-gray-500 dark:text-gray-500 text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <p>Reçu généré le {format(new Date(), 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
          <p className="mt-1">Ce document fait foi de paiement</p>
        </div>

        {/* Bouton de retour */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 no-print">
          <Link
            href="/bookings"
            className="btn-outline inline-flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux réservations
          </Link>
        </div>
      </div>
    </div>
  );
}
