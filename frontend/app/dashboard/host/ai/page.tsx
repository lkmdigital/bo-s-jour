'use client';

import { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
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

export default function HostAiAssistantPage() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [exchanges, setExchanges] = useState<Exchange[]>([]);

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
    </div>
  );
}
