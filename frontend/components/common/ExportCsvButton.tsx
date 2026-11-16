'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { downloadFile } from '@/lib/downloadFile';
import { useToast } from '@/components/common/ToastContext';

interface Props {
  /** Route d'export de l'API (ex. « /admin/bookings/export »). */
  url: string;
  /** Filtres actuellement appliqués à la page : l'export porte sur TOUTES les lignes qui y correspondent, pas seulement la page affichée. */
  params: Record<string, unknown>;
  /** Nom du fichier sans date ni extension (« reservations » → reservations-2026-11-16.csv). */
  filenamePrefix: string;
  label?: string;
}

/** Bouton « Exporter (CSV) » : fichier lisible directement dans Excel (UTF-8 avec BOM, séparateur « ; »). */
export default function ExportCsvButton({ url, params, filenamePrefix, label = 'Exporter (CSV)' }: Props) {
  const { showError } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await downloadFile(url, params, `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`);
    } catch {
      showError("Impossible de générer l'export. Réessayez dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="btn-outline inline-flex items-center gap-2 text-sm disabled:opacity-60 shrink-0"
    >
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {label}
    </button>
  );
}
