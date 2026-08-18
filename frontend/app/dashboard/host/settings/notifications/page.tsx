'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import HostSettingsPageHeader from '@/components/dashboard/host/HostSettingsPageHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { Bell } from 'lucide-react';

export default function HostNotificationsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState({ notif_email: true, notif_whatsapp: true, notif_sms: false });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.get('/me')
      .then((r) => {
        const me = r.data?.user ?? r.data;
        if (me) setNotif({ notif_email: !!me.notif_email, notif_whatsapp: !!me.notif_whatsapp, notif_sms: !!me.notif_sms });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async (next: typeof notif) => {
    setNotif(next);
    setSaving(true);
    setMsg(null);
    try {
      await api.put('/me/profile', next);
      setMsg('Préférences enregistrées ✓');
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg("Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <HostSettingsPageHeader
        icon={Bell}
        title="Notifications"
        description="Choisissez comment être prévenu des nouvelles réservations, messages et avis."
      />

      {loading ? (
        <LoadingSpinner />
      ) : (
        <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
          <div className="space-y-3">
            {[
              { k: 'notif_email' as const, label: 'E-mail' },
              { k: 'notif_whatsapp' as const, label: 'WhatsApp' },
              { k: 'notif_sms' as const, label: 'SMS' },
            ].map((n) => (
              <label key={n.k} className="flex items-center justify-between text-sm py-1">
                <span>{n.label}</span>
                <input
                  type="checkbox"
                  checked={notif[n.k]}
                  disabled={saving}
                  onChange={(e) => save({ ...notif, [n.k]: e.target.checked })}
                  className="w-5 h-5 accent-[#FF0000]"
                />
              </label>
            ))}
          </div>
          {msg && <p className="text-xs text-green-600 dark:text-green-400 mt-3">{msg}</p>}
        </section>
      )}
    </div>
  );
}
