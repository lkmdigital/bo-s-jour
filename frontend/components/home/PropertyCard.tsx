'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { cn, formatPrice, resolveImageUrl } from '@/lib/utils';

export interface PropertyCardData {
  id: number | string;
  title: string;
  location: string;
  image: string;
  rating?: number;
  reviews?: number;
  price: number;
  oldPrice?: number;
  offerLabel?: string;
  href?: string;
}

function ratingLabel(r: number) {
  if (r >= 4.8) return 'Excellent';
  if (r >= 4.2) return 'Très bien';
  if (r >= 3.5) return 'Bien';
  return 'Correct';
}

export default function PropertyCard({ data }: { data: PropertyCardData }) {
  const [fav, setFav] = useState(false);
  const href = data.href || `/accommodations/${data.id}`;

  return (
    <div className="group bg-white dark:bg-gray-800 rounded-2xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-xl">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Link href={href}>
          <Image
            src={resolveImageUrl(data.image) || data.image}
            alt={data.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 25vw"
          />
        </Link>
        <button
          type="button"
          onClick={() => setFav((f) => !f)}
          aria-label="Ajouter aux favoris"
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow hover:scale-110 transition-transform"
        >
          <Heart className={cn('w-4 h-4', fav ? 'fill-primary text-primary' : 'text-gray-700')} />
        </button>
      </div>

      <Link href={href} className="block p-4">
        {typeof data.rating === 'number' && (
          <div className="flex items-center gap-2 mb-1.5 text-sm">
            <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-xs">
              {data.rating.toFixed(1)}
            </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{ratingLabel(data.rating)}</span>
            {data.reviews != null && <span className="text-gray-400 text-xs">{data.reviews} avis</span>}
          </div>
        )}

        <h3 className="font-bold text-gray-900 dark:text-white truncate">{data.title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{data.location}</p>

        {data.offerLabel && (
          <span className="inline-block mt-2 px-2.5 py-1 rounded-full bg-green-600 text-white text-xs font-semibold">
            {data.offerLabel}
          </span>
        )}

        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-xs text-gray-400">Par nuit</span>
          {data.oldPrice && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(data.oldPrice)} fcfa</span>
          )}
          <span className="text-base font-bold text-gray-900 dark:text-white">
            {formatPrice(data.price)} fcfa
          </span>
        </div>
      </Link>
    </div>
  );
}
