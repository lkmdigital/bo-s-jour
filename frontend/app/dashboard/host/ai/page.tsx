'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Send, Loader2, PenLine, Languages, Search, Copy, Check } from 'lucide-react';
import api from '@/lib/api';

const EXAMPLE_QUESTIONS = [
  "Quel est mon taux d'occupation ?",
  'Combien vais-je recevoir lors du prochain reversement ?',
  'Quelle chambre est la plus rentable ?',
];

interface Exchange {
  question: string;
  answer: string;
  isError?: boolean;
}

interface AccommodationOption {
  id: number;
  name: string;
}

interface RoomOption {
  id: number;
  name: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-bosejour-red"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copié' : 'Copier'}
    </button>
  );
}

// Module IA — masqué le 2026-08-27 en attendant un échange avec le client sur la
// confidentialité documentaire (Vague 7 du plan Module IA). Code d'origine conservé
// ci-dessous (non exporté) pour réactivation rapide une fois validé.
export default function HostAiAssistantPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center text-gray-500 dark:text-gray-400">
      <p className="text-sm">Cette fonctionnalité est temporairement indisponible.</p>
    </div>
  );
}

function HostAiAssistantPageOriginal() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

  const [accommodations, setAccommodations] = useState<AccommodationOption[]>([]);
  const [selectedAccId, setSelectedAccId] = useState<number | ''>('');

  const [descResult, setDescResult] = useState('');
  const [descLoading, setDescLoading] = useState<'write' | 'improve' | null>(null);

  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | ''>('');
  const [roomDescResult, setRoomDescResult] = useState('');
  const [roomDescLoading, setRoomDescLoading] = useState<'write' | 'improve' | null>(null);

  const [translateInput, setTranslateInput] = useState('');
  const [translateResult, setTranslateResult] = useState('');
  const [translateLoading, setTranslateLoading] = useState(false);

  const [seoResult, setSeoResult] = useState('');
  const [seoLoading, setSeoLoading] = useState(false);

  useEffect(() => {
    api.get('/accommodations/my', { params: { per_page: 50 } })
      .then((res) => {
        const items = res.data?.data ?? res.data ?? [];
        const list = Array.isArray(items) ? items : [];
        setAccommodations(list);
        if (list.length > 0) setSelectedAccId(list[0].id);
      })
      .catch(() => setAccommodations([]));
  }, []);

  useEffect(() => {
    if (!selectedAccId) { setRooms([]); setSelectedRoomId(''); return; }
    api.get(`/accommodations/${selectedAccId}/rooms/manage`)
      .then((res) => {
        const items = res.data?.data ?? res.data ?? [];
        const list = Array.isArray(items) ? items : [];
        setRooms(list);
        setSelectedRoomId(list.length > 0 ? list[0].id : '');
      })
      .catch(() => { setRooms([]); setSelectedRoomId(''); });
  }, [selectedAccId]);

  const generateDescription = async (mode: 'write' | 'improve') => {
    if (!selectedAccId) return;
    setDescLoading(mode);
    setDescResult('');
    try {
      const res = await api.post('/host/ai/content/accommodation-description', { accommodation_id: selectedAccId, mode });
      setDescResult(res.data?.data?.text || '');
    } catch (err: any) {
      setDescResult(err.response?.data?.message || "L'assistant IA n'a pas pu générer de texte.");
    } finally {
      setDescLoading(null);
    }
  };

  const generateRoomDescription = async (mode: 'write' | 'improve') => {
    if (!selectedRoomId) return;
    setRoomDescLoading(mode);
    setRoomDescResult('');
    try {
      const res = await api.post('/host/ai/content/room-description', { room_id: selectedRoomId, mode });
      setRoomDescResult(res.data?.data?.text || '');
    } catch (err: any) {
      setRoomDescResult(err.response?.data?.message || "L'assistant IA n'a pas pu générer de texte.");
    } finally {
      setRoomDescLoading(null);
    }
  };

  const translate = async () => {
    const text = translateInput.trim();
    if (!text) return;
    setTranslateLoading(true);
    setTranslateResult('');
    try {
      const res = await api.post('/host/ai/content/translate', { text });
      setTranslateResult(res.data?.data?.text || '');
    } catch (err: any) {
      setTranslateResult(err.response?.data?.message || "L'assistant IA n'a pas pu traduire ce texte.");
    } finally {
      setTranslateLoading(false);
    }
  };

  const generateSeo = async () => {
    if (!selectedAccId) return;
    setSeoLoading(true);
    setSeoResult('');
    try {
      const res = await api.post('/host/ai/content/seo-suggestions', { accommodation_id: selectedAccId });
      setSeoResult(res.data?.data?.text || '');
    } catch (err: any) {
      setSeoResult(err.response?.data?.message || "L'assistant IA n'a pas pu générer de suggestions.");
    } finally {
      setSeoLoading(false);
    }
  };

  const ask = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setQuestion('');
    try {
      const res = await api.post('/host/ai/ask', { question: trimmed });
      setExchanges((prev) => [{ question: trimmed, answer: res.data?.data?.answer || 'Aucune réponse.' }, ...prev]);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Une erreur est survenue. Réessayez dans un instant.';
      setExchanges((prev) => [{ question: trimmed, answer: message, isError: true }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-bosejour-red" /> Assistant IA
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Interrogez la gestion de vos établissements en langage naturel — occupation, reversements, performances.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {EXAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-bosejour-red hover:text-bosejour-red transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); ask(question); }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Posez une question sur la gestion de vos établissements…"
            disabled={loading}
            className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:border-bosejour-red focus:ring-1 focus:ring-bosejour-red outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {loading ? 'Recherche…' : 'Poser la question'}
          </button>
        </form>
      </div>

      {exchanges.length === 0 && !loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-8 text-center">
          <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Posez une question ou choisissez un exemple ci-dessus pour commencer.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {exchanges.map((ex, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white flex items-start gap-2">
                <span className="text-gray-400 flex-shrink-0">Q ·</span> {ex.question}
              </p>
              <p className={`text-sm flex items-start gap-2 ${ex.isError ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                <span className={`flex-shrink-0 ${ex.isError ? 'text-red-400' : 'text-bosejour-red'}`}>R ·</span> {ex.answer}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Génération de contenu */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <PenLine className="w-5 h-5 text-bosejour-red" /> Génération de contenu
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Des brouillons à relire et adapter — rien n&apos;est publié automatiquement, copiez le texte vers votre fiche établissement vous-même.
        </p>
      </div>

      {accommodations.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Établissement</label>
            <select
              value={selectedAccId}
              onChange={(e) => setSelectedAccId(e.target.value ? Number(e.target.value) : '')}
              className="w-full sm:w-80 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
            >
              {accommodations.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => generateDescription('write')}
              disabled={descLoading !== null}
              className="btn-outline text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {descLoading === 'write' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
              Rédiger une présentation
            </button>
            <button
              type="button"
              onClick={() => generateDescription('improve')}
              disabled={descLoading !== null}
              className="btn-outline text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {descLoading === 'improve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Améliorer le texte existant
            </button>
            <button
              type="button"
              onClick={generateSeo}
              disabled={seoLoading}
              className="btn-outline text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {seoLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Suggestions SEO
            </button>
          </div>

          {descResult && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-500">Présentation générée</span>
                <CopyButton text={descResult} />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{descResult}</p>
            </div>
          )}

          {seoResult && (
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-500">Suggestions SEO</span>
                <CopyButton text={seoResult} />
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{seoResult}</p>
            </div>
          )}

          {rooms.length > 0 && (
            <div className="pt-3 mt-1 border-t border-gray-100 dark:border-gray-700 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Chambre</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full sm:w-80 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => generateRoomDescription('write')}
                  disabled={roomDescLoading !== null}
                  className="btn-outline text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {roomDescLoading === 'write' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PenLine className="w-3.5 h-3.5" />}
                  Rédiger la description de la chambre
                </button>
                <button
                  type="button"
                  onClick={() => generateRoomDescription('improve')}
                  disabled={roomDescLoading !== null}
                  className="btn-outline text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {roomDescLoading === 'improve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Améliorer le texte existant
                </button>
              </div>
              {roomDescResult && (
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-500">Description de chambre générée</span>
                    <CopyButton text={roomDescResult} />
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{roomDescResult}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Traduction */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
          <Languages className="w-4 h-4 text-bosejour-red" /> Traduire un texte (FR → EN)
        </h3>
        <textarea
          value={translateInput}
          onChange={(e) => setTranslateInput(e.target.value)}
          rows={3}
          placeholder="Collez ici la description à traduire…"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
        />
        <button
          type="button"
          onClick={translate}
          disabled={translateLoading || !translateInput.trim()}
          className="btn-outline text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {translateLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Languages className="w-3.5 h-3.5" />}
          Traduire
        </button>
        {translateResult && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-gray-500">Traduction</span>
              <CopyButton text={translateResult} />
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">{translateResult}</p>
          </div>
        )}
      </div>
    </div>
  );
}
