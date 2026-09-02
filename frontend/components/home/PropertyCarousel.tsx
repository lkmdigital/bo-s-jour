'use client';

import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PropertyCard, { PropertyCardData } from './PropertyCard';

interface Props {
  title: string;
  items: PropertyCardData[];
  className?: string;
}

export default function PropertyCarousel({ title, items, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!ref.current) return;
    ref.current.scrollBy({ left: dir === 'left' ? -360 : 360, behavior: 'smooth' });
  };

  return (
    <section className={`container mx-auto px-4 md:px-8 max-w-7xl py-12 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{title}</h2>
        <div className="flex gap-2">
          <button onClick={() => scroll('left')} aria-label="Précédent"
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => scroll('right')} aria-label="Suivant"
            className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:border-primary hover:text-primary transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div ref={ref} className="flex gap-5 overflow-x-auto pb-2 snap-x [&>*]:snap-start">
        {items.map((item) => (
          <div key={item.id} className="min-w-[260px] w-[260px] md:min-w-[280px] md:w-[280px] flex-shrink-0">
            <PropertyCard data={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
