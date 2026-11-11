'use client';

import { useCallback } from 'react';
import api from '@/lib/api';
import { useConfirm } from '@/components/common/ConfirmContext';
import { useToast } from '@/components/common/ToastContext';

/**
 * Suppression d'un ambassadeur en deux temps : une première confirmation, puis — s'il a déjà des clients rattachés — une seconde qui dit
 * exactement ce qui est effacé. Retourne true si l'ambassadeur a été supprimé.
 */
export function useDeleteAmbassador() {
  const confirm = useConfirm();
  const { showError, showSuccess } = useToast();

  return useCallback(
    async (ambassador: { id: number; name: string }): Promise<boolean> => {
      const ok = await confirm({
        title: `Supprimer ${ambassador.name} ?`,
        message: 'Son code, son lien, son QR code et ses statistiques de visites seront supprimés. Son compte membre et ses points ne sont pas touchés. Pour simplement le mettre en pause, utilisez « Suspendre ».',
        confirmLabel: 'Supprimer',
        variant: 'danger',
      });
      if (!ok) return false;

      const url = `/admin/referral-partners/${ambassador.id}`;
      try {
        await api.delete(url);
      } catch (err: any) {
        const data = err.response?.data;
        if (err.response?.status === 409 && data?.requires_confirmation) {
          const sure = await confirm({
            title: `${data.referrals} client${data.referrals > 1 ? 's' : ''} rattaché${data.referrals > 1 ? 's' : ''} à ${ambassador.name}`,
            message:
              `Supprimer cet ambassadeur efface leur historique de parrainage, ainsi que les remises de bienvenue qu'ils n'ont pas encore utilisées. ` +
              `Les ${data.points_awarded} points déjà versés restent acquis ; les comptes et les réservations de ces clients ne sont pas touchés. Cette action est définitive.`,
            confirmLabel: 'Supprimer quand même',
            variant: 'danger',
          });
          if (!sure) return false;
          try {
            await api.delete(url, { params: { force: 1 } });
          } catch {
            showError('Erreur lors de la suppression');
            return false;
          }
        } else {
          showError(data?.message || 'Erreur lors de la suppression');
          return false;
        }
      }
      showSuccess('Ambassadeur supprimé');
      return true;
    },
    [confirm, showError, showSuccess]
  );
}
