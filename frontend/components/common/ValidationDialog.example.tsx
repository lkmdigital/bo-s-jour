'use client';

// EXEMPLE D'UTILISATION DU VALIDATION DIALOG
// Ce fichier montre comment utiliser le ValidationDialog dans vos composants

import { useValidation } from './ValidationContext';

export function ExampleUsage() {
  const showValidation = useValidation();

  // Exemple 1: Afficher un dialog de conformité simple
  const handleShowCompliance = () => {
    showValidation({
      title: 'Profil non conforme',
      message: 'Certains documents obligatoires sont manquants. Veuillez compléter votre profil pour débloquer toutes les fonctionnalités.',
      requirements: [
        { key: 'manager_identity', label: 'Pièce d\'identité du gérant', ok: true },
        { key: 'id_number', label: 'Numéro de pièce d\'identité', ok: true },
        { key: 'establishment_phone', label: 'Téléphone fixe de l\'établissement', ok: false, info: 'Requis pour les hôtels et lodges' },
        { key: 'rccm', label: 'Numéro RCCM', ok: false, info: 'Registre du Commerce' },
        { key: 'tax_account_number', label: 'Numéro de compte contribuable', ok: false },
      ],
      complianceStatus: 'non_conforme',
      variant: 'warning',
      actionLabel: 'Compléter mon profil',
      actionHref: '/dashboard/host/profile',
    });
  };

  // Exemple 2: Afficher un dialog de succès
  const handleShowSuccess = () => {
    showValidation({
      title: 'Profil conforme',
      message: 'Votre profil est conforme. Vous pouvez maintenant créer des établissements et recevoir des réservations.',
      requirements: [
        { key: 'manager_identity', label: 'Pièce d\'identité du gérant', ok: true },
        { key: 'id_number', label: 'Numéro de pièce d\'identité', ok: true },
        { key: 'establishment_phone', label: 'Téléphone fixe de l\'établissement', ok: true },
        { key: 'rccm', label: 'Numéro RCCM', ok: true },
        { key: 'tax_account_number', label: 'Numéro de compte contribuable', ok: true },
      ],
      complianceStatus: 'conforme',
      variant: 'success',
      actionLabel: 'Continuer',
      showCancel: false,
    });
  };

  // Exemple 3: Afficher un dialog avec action personnalisée
  const handleShowWithAction = () => {
    showValidation({
      title: 'Validation requise',
      message: 'Votre profil doit être complété avant de pouvoir ajouter un hébergement.',
      requirements: [
        { key: 'id_document', label: 'Document d\'identité', ok: false },
        { key: 'proof_of_address', label: 'Justificatif de domicile', ok: false },
      ],
      complianceStatus: 'non_conforme',
      variant: 'info',
      actionLabel: 'Aller au profil',
      onAction: () => {
        // Action personnalisée
        console.log('Navigation vers le profil...');
        window.location.href = '/dashboard/host/profile';
      },
    });
  };

  return (
    <div className="space-y-4">
      <button onClick={handleShowCompliance} className="btn-primary">
        Voir conformité (warning)
      </button>
      <button onClick={handleShowSuccess} className="btn-primary">
        Voir conformité (success)
      </button>
      <button onClick={handleShowWithAction} className="btn-primary">
        Voir avec action personnalisée
      </button>
    </div>
  );
}
