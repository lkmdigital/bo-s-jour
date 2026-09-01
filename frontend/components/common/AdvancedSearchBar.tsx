'use client';

import { useState, useEffect } from 'react';
import { Search, Calendar, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import SearchInputWithAutocomplete from './SearchInputWithAutocomplete';
import { useSearchStore } from '@/stores/searchStore';
import { toDateInputValue } from '@/lib/utils';

interface AdvancedSearchBarProps {
  onSearch: (params: {
    search?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    city?: string;
    type?: string;
  }) => void;
  initialValues?: {
    search?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
    city?: string;
    type?: string;
  };
}

export default function AdvancedSearchBar({ onSearch, initialValues }: AdvancedSearchBarProps) {
  const { session, setSearchSession } = useSearchStore();
  const [search, setSearch] = useState(initialValues?.search || session?.search || '');
  const [checkIn, setCheckIn] = useState(initialValues?.checkIn || session?.checkIn || '');
  const [checkOut, setCheckOut] = useState(initialValues?.checkOut || session?.checkOut || '');
  const [guests, setGuests] = useState(initialValues?.guests ?? session?.guests ?? 1);
  const [city, setCity] = useState(initialValues?.city || session?.city || '');
  const [type, setType] = useState(initialValues?.type || session?.type || '');

  useEffect(() => {
    if (session && !initialValues?.checkIn) {
      setCheckIn(session.checkIn || '');
      setCheckOut(session.checkOut || '');
      setGuests(session.guests ?? 1);
      setSearch(session.search || '');
      setCity(session.city || '');
      setType(session.type || '');
    }
  }, [session]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = {
      search: search.trim() || undefined,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      guests: guests > 0 ? guests : undefined,
      city: city.trim() || undefined,
      type: type || undefined,
    };
    setSearchSession(params);
    onSearch(params);
  };

  // Date minimale = aujourd'hui
  const today = toDateInputValue(new Date());
  // Date minimale pour check-out = check-in ou aujourd'hui
  const minCheckOut = checkIn || today;

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6 space-y-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Recherche textuelle avec autocomplétion */}
      <SearchInputWithAutocomplete
        value={search}
        onChange={(value, type, extra) => {
          setSearch(value);
          if (type === 'city' && extra?.city) setCity(extra.city);
          if (type === 'accommodation' && extra?.city) setCity(extra.city);
        }}
        placeholder="Rechercher un hébergement, une ville..."
        className="focus-within:ring-2 focus-within:ring-primary focus-within:ring-opacity-50 rounded-lg"
      />

      {/* Dates et voyageurs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Date d'arrivée */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Date d'arrivée
          </label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              // Réinitialiser check-out si elle est avant la nouvelle check-in
              if (checkOut && e.target.value && checkOut < e.target.value) {
                setCheckOut('');
              }
            }}
            min={today}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
          />
        </div>

        {/* Date de départ */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Date de départ
          </label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={minCheckOut}
            disabled={!checkIn}
            className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 ${
              !checkIn ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          />
        </div>

        {/* Nombre de voyageurs */}
        <div className="relative">
          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Nombre de voyageurs
          </label>
          <input
            type="number"
            value={guests}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 1;
              setGuests(Math.max(1, value));
            }}
            min={1}
            max={20}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      {/* Filtres supplémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Ville */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Ville
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Abidjan"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
          />
        </div>

        {/* Type */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
            Type d'hébergement
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800"
          >
            <option value="">Tous</option>
            <option value="hotel">Hôtel</option>
            <option value="lodge">Lodge</option>
            <option value="guesthouse">Maison d'hôtes</option>
            <option value="apartment">Appartement</option>
          </select>
        </div>
      </div>

      {/* Bouton de recherche */}
      <motion.button
        type="submit"
        className="w-full bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-dark transition-colors duration-200 flex items-center justify-center gap-2"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Search className="w-5 h-5" />
        Rechercher
      </motion.button>
    </motion.form>
  );
}
