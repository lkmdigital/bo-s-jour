'use client';

import { useState } from 'react';
import { 
  Bed, Bath, Eye, DollarSign, Home, Wifi, Coffee, 
  Check, ChevronRight, ChevronLeft, Sparkles, Wind,
  Tv, Lock, Gift, Armchair, Wine, BriefcaseIcon,
  Footprints, Shirt, Mountain, Waves, TreePine, Car
} from 'lucide-react';

interface EnhancedRoomFormProps {
  accommodationId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const STEPS = [
  { id: 1, title: 'Catégorie', icon: Bed },
  { id: 2, title: 'Literie & Dimensions', icon: Home },
  { id: 3, title: 'Salle de bain', icon: Bath },
  { id: 4, title: 'Équipements', icon: Wifi },
  { id: 5, title: 'Vue & Extérieur', icon: Eye },
  { id: 6, title: 'Espaces supp.', icon: Armchair },
  { id: 7, title: 'Options premium', icon: Sparkles },
  { id: 8, title: 'Tarification', icon: DollarSign },
];

const CATEGORIES = [
  { value: 'single', label: 'Chambre Single', capacity: 1, subcategories: ['standard'] },
  { 
    value: 'double', 
    label: 'Chambre Double', 
    capacity: 2, 
    subcategories: ['standard', 'confort', 'superieure', 'deluxe', 'premium'] 
  },
  { value: 'twin', label: 'Chambre Twin', capacity: 2, subcategories: ['standard'] },
  { value: 'triple', label: 'Chambre Triple', capacity: 3, subcategories: ['standard'] },
  { value: 'pmr', label: 'Chambre Accessible PMR', capacity: 2, subcategories: ['standard'] },
  { 
    value: 'suite', 
    label: 'Suite', 
    capacity: 2, 
    subcategories: ['junior', 'superieure', 'familiale', 'executive'] 
  },
  { value: 'other', label: 'Autre', capacity: null, subcategories: ['studio', 'appartement', 'bungalow', 'villa'] },
];

const SUBCATEGORY_LABELS: Record<string, string> = {
  standard: 'Standard',
  confort: 'Confort',
  superieure: 'Supérieure',
  deluxe: 'Deluxe',
  premium: 'Premium',
  junior: 'Junior',
  familiale: 'Familiale',
  executive: 'Executive',
  studio: 'Studio',
  appartement: 'Appartement',
  bungalow: 'Bungalow',
  villa: 'Villa',
};

const BEDDING_TYPES = [
  { value: 'single_80', label: 'Lit Single 80×180 cm' },
  { value: 'single_90', label: 'Lit Single 90×180 cm' },
  { value: 'double_140', label: 'Lit Double 140×180 cm' },
  { value: 'queen_160', label: 'Lit Queen 160×200 cm' },
  { value: 'king_200', label: 'Lit King 200×200 cm' },
  { value: 'twin', label: '2 Lits Single séparés' },
  { value: 'custom', label: 'Autre (à préciser)' },
];

const BATHROOM_FEATURES = [
  { value: 'shower', label: 'Douche', icon: Bath },
  { value: 'bathtub', label: 'Baignoire', icon: Bath },
  { value: 'jacuzzi', label: 'Jacuzzi', icon: Sparkles },
  { value: 'italian_shower', label: 'Douche à l\'italienne', icon: Bath },
  { value: 'double_sink', label: 'Double vasque', icon: Bath },
];

const BASIC_AMENITIES = [
  { value: 'tv', label: 'Télévision', icon: Tv },
  { value: 'air_conditioning', label: 'Climatisation', icon: Wind },
  { value: 'wifi', label: 'Wi-Fi', icon: Wifi },
  { value: 'desk', label: 'Bureau', icon: BriefcaseIcon },
  { value: 'hairdryer', label: 'Sèche-cheveux', icon: Wind },
  { value: 'minibar', label: 'Mini-bar', icon: Wine },
  { value: 'safe', label: 'Coffre-fort', icon: Lock },
  { value: 'coffee_machine', label: 'Machine à café', icon: Coffee },
];

const VIEW_TYPES = [
  { value: 'city', label: 'Vue Ville', modifier: 0, icon: Home },
  { value: 'garden', label: 'Vue Jardin', modifier: 10, icon: TreePine },
  { value: 'pool', label: 'Vue Piscine', modifier: 15, icon: Waves },
  { value: 'sea', label: 'Vue Mer', modifier: 30, icon: Waves },
  { value: 'mountain', label: 'Vue Montagne', modifier: 20, icon: Mountain },
  { value: 'parking', label: 'Vue Parking', modifier: -5, icon: Car },
];

export default function EnhancedRoomForm({ accommodationId, onSuccess, onCancel }: EnhancedRoomFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<any>({
    name: '',
    room_category: '',
    room_subcategory: '',
    capacity: 0,
    price_per_night: '',
    surface_area: '',
    bedding: {},
    bathroom_features: [],
    basic_amenities: [],
    view_type: '',
    outdoor_features: [],
    premium_amenities: [],
  });

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const toggleArrayValue = (field: string, value: string) => {
    setFormData((prev: any) => {
      const current = prev[field] || [];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter((v: string) => v !== value) };
      }
      return { ...prev, [field]: [...current, value] };
    });
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.value === formData.room_category);
  const basePrice = parseFloat(formData.price_per_night) || 0;
  const viewModifier = VIEW_TYPES.find(v => v.value === formData.view_type)?.modifier || 0;
  const adjustedPrice = basePrice + (basePrice * viewModifier / 100);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className={`flex flex-col items-center ${index < STEPS.length - 1 ? 'flex-1' : ''}`}>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-primary text-white scale-110'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs mt-2 text-center hidden sm:block ${isActive ? 'font-bold text-primary' : 'text-gray-600 dark:text-gray-400'}`}>
                    {step.title}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 transition-all ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form content */}
      <div className="card p-6 min-h-[400px]">
        {/* Étape 1: Catégorie */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Catégorie de chambre</h2>
            
            <div>
              <label className="block text-sm font-medium mb-3">Type de chambre</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      updateFormData('room_category', cat.value);
                      updateFormData('room_subcategory', cat.subcategories[0]);
                      updateFormData('capacity', cat.capacity);
                    }}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      formData.room_category === cat.value
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 dark:border-gray-700 hover:border-primary'
                    }`}
                  >
                    <div className="font-semibold">{cat.label}</div>
                    {cat.capacity && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {cat.capacity} {cat.capacity > 1 ? 'personnes' : 'personne'}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {formData.room_category && selectedCategory && selectedCategory.subcategories.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-3">Niveau de confort</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {selectedCategory.subcategories.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => updateFormData('room_subcategory', sub)}
                      className={`p-3 border-2 rounded-lg text-center transition-all ${
                        formData.room_subcategory === sub
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-300 dark:border-gray-700 hover:border-primary'
                      }`}
                    >
                      {SUBCATEGORY_LABELS[sub]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Nom de la chambre</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                placeholder="Ex: Chambre Double Supérieure Vue Mer"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Étape 2: Literie et dimensions */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Literie et dimensions</h2>
            
            <div>
              <label className="block text-sm font-medium mb-3">Type de lit</label>
              <div className="grid grid-cols-2 gap-3">
                {BEDDING_TYPES.map((bed) => (
                  <button
                    key={bed.value}
                    type="button"
                    onClick={() => updateFormData('bedding', { type: bed.value })}
                    className={`p-3 border-2 rounded-lg text-center transition-all ${
                      formData.bedding?.type === bed.value
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 dark:border-gray-700 hover:border-primary'
                    }`}
                  >
                    {bed.label}
                  </button>
                ))}
              </div>
            </div>

            {formData.bedding?.type === 'custom' && (
              <div>
                <label className="block text-sm font-medium mb-2">Précisez la literie</label>
                <input
                  type="text"
                  placeholder="Ex: Lit 180×200 cm"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Superficie (m²)</label>
              <input
                type="number"
                value={formData.surface_area}
                onChange={(e) => updateFormData('surface_area', e.target.value)}
                step="0.1"
                min="0"
                placeholder="Ex: 25.5"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* Étape 3: Salle de bain */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Salle de bain</h2>
            
            <div>
              <label className="block text-sm font-medium mb-3">Équipements (sélection multiple)</label>
              <div className="grid grid-cols-2 gap-3">
                {BATHROOM_FEATURES.map((feature) => {
                  const Icon = feature.icon;
                  const isSelected = formData.bathroom_features?.includes(feature.value);
                  
                  return (
                    <button
                      key={feature.value}
                      type="button"
                      onClick={() => toggleArrayValue('bathroom_features', feature.value)}
                      className={`p-3 border-2 rounded-lg flex items-center gap-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-300 dark:border-gray-700 hover:border-primary'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{feature.label}</span>
                      {isSelected && <Check className="w-4 h-4 ml-auto text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Étape 4: Équipements */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Équipements de base</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {BASIC_AMENITIES.map((amenity) => {
                const Icon = amenity.icon;
                const isSelected = formData.basic_amenities?.includes(amenity.value);
                
                return (
                  <button
                    key={amenity.value}
                    type="button"
                    onClick={() => toggleArrayValue('basic_amenities', amenity.value)}
                    className={`p-3 border-2 rounded-lg flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 dark:border-gray-700 hover:border-primary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{amenity.label}</span>
                    {isSelected && <Check className="w-4 h-4 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Étape 5: Vue et extérieur */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Vue et extérieur</h2>
            
            <div>
              <label className="block text-sm font-medium mb-3">Type de vue</label>
              <div className="grid grid-cols-2 gap-3">
                {VIEW_TYPES.map((view) => {
                  const Icon = view.icon;
                  
                  return (
                    <button
                      key={view.value}
                      type="button"
                      onClick={() => updateFormData('view_type', view.value)}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        formData.view_type === view.value
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-300 dark:border-gray-700 hover:border-primary'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{view.label}</span>
                      </div>
                      <div className={`text-sm ${view.modifier > 0 ? 'text-green-600' : view.modifier < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {view.modifier > 0 && '+'}{view.modifier}% sur le prix
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Espace extérieur</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'balcony', label: 'Balcon' },
                  { value: 'terrace', label: 'Terrasse' },
                ].map((outdoor) => {
                  const isSelected = formData.outdoor_features?.includes(outdoor.value);
                  
                  return (
                    <button
                      key={outdoor.value}
                      type="button"
                      onClick={() => toggleArrayValue('outdoor_features', outdoor.value)}
                      className={`p-3 border-2 rounded-lg transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-300 dark:border-gray-700 hover:border-primary'
                      }`}
                    >
                      {outdoor.label}
                      {isSelected && <Check className="w-4 h-4 ml-2 inline text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Étape 6: Espaces supplémentaires */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Espaces supplémentaires</h2>
            <p className="text-gray-600 dark:text-gray-400">Pour les suites et grands logements</p>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.has_living_room || false}
                  onChange={(e) => updateFormData('has_living_room', e.target.checked)}
                  className="w-5 h-5 text-primary"
                />
                <span className="font-medium">Espace salon</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.has_kitchen || false}
                  onChange={(e) => updateFormData('has_kitchen', e.target.checked)}
                  className="w-5 h-5 text-primary"
                />
                <span className="font-medium">Cuisine / Kitchenette</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.has_private_pool || false}
                  onChange={(e) => updateFormData('has_private_pool', e.target.checked)}
                  className="w-5 h-5 text-primary"
                />
                <span className="font-medium">Piscine privée</span>
              </label>
            </div>
          </div>
        )}

        {/* Étape 7: Options premium */}
        {currentStep === 7 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Options premium</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'courtesy_tray', label: 'Plateau de courtoisie', icon: Coffee },
                { value: 'welcome_products', label: 'Produits d\'accueil', icon: Gift },
                { value: 'bathrobe', label: 'Peignoir', icon: Shirt },
                { value: 'slippers', label: 'Chaussons', icon: Footprints },
              ].map((premium) => {
                const Icon = premium.icon;
                const isSelected = formData.premium_amenities?.includes(premium.value);
                
                return (
                  <button
                    key={premium.value}
                    type="button"
                    onClick={() => toggleArrayValue('premium_amenities', premium.value)}
                    className={`p-3 border-2 rounded-lg flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-gray-300 dark:border-gray-700 hover:border-primary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{premium.label}</span>
                    {isSelected && <Check className="w-4 h-4 ml-auto text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Étape 8: Tarification */}
        {currentStep === 8 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Tarification</h2>
            
            <div>
              <label className="block text-sm font-medium mb-2">Prix de base par nuit (FCFA)</label>
              <input
                type="number"
                value={formData.price_per_night}
                onChange={(e) => updateFormData('price_per_night', e.target.value)}
                min="0"
                step="1000"
                placeholder="Ex: 50000"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
              />
            </div>

            {formData.view_type && basePrice > 0 && (
              <div className="card bg-blue-50 dark:bg-blue-900/20 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Prix de base:</span>
                  <span className="font-bold">{basePrice.toLocaleString()} FCFA</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Modificateur vue ({viewModifier}%):</span>
                  <span className={viewModifier > 0 ? 'text-green-600' : viewModifier < 0 ? 'text-red-600' : ''}>
                    {viewModifier > 0 && '+'}{(basePrice * viewModifier / 100).toLocaleString()} FCFA
                  </span>
                </div>
                <div className="border-t border-gray-300 dark:border-gray-700 pt-2 mt-2 flex items-center justify-between">
                  <span className="font-bold">Prix final:</span>
                  <span className="text-xl font-bold text-primary">{adjustedPrice.toLocaleString()} FCFA</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Prix occupation simple (optionnel)</label>
              <input
                type="number"
                value={formData.single_occupancy_price}
                onChange={(e) => updateFormData('single_occupancy_price', e.target.value)}
                min="0"
                step="1000"
                placeholder="Ex: 42500 (-15%)"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg"
              />
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Suggestion: {(basePrice * 0.85).toLocaleString()} FCFA (-15%)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Précédent
        </button>

        <div className="text-sm text-gray-600 dark:text-gray-400">
          Étape {currentStep} sur {STEPS.length}
        </div>

        {currentStep < STEPS.length ? (
          <button
            type="button"
            onClick={nextStep}
            className="btn-primary flex items-center gap-2"
          >
            Suivant
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              // TODO: Submit form
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            Créer la chambre
          </button>
        )}
      </div>
    </div>
  );
}
