import api from '@/lib/api';

/** Télécharge un fichier renvoyé par l'API (session par cookie) : appelle l'URL en `blob`, puis déclenche l'enregistrement dans le navigateur. */
export async function downloadFile(url: string, params: Record<string, unknown>, filename: string): Promise<void> {
  const response = await api.get(url, { params, responseType: 'blob' });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
