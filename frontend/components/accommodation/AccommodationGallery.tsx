'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Grip, Heart, Share2 } from 'lucide-react';
import ImageLightbox from '@/components/common/ImageLightbox';
import { cn, resolveImageUrl } from '@/lib/utils';

interface Props {
  images: Array<{ url: string; is_primary?: boolean }>;
  name?: string;
}

const FALLBACK = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80';

export default function AccommodationGallery({ images, name = 'Établissement' }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [fav, setFav] = useState(false);

  const pics = (images && images.length ? images : [{ url: FALLBACK }]).map((i) => ({
    url: resolveImageUrl(i.url) || i.url || FALLBACK,
  }));

  const openAt = (i: number) => { setIndex(i); setOpen(true); };
  const next = () => setIndex((i) => (i + 1) % pics.length);
  const prev = () => setIndex((i) => (i - 1 + pics.length) % pics.length);

  const single = pics.length === 1;

  return (
    <div className="relative">
      {/* Actions overlay */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          onClick={() => navigator.share?.({ title: name, url: typeof window !== 'undefined' ? window.location.href : '' })}
          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow hover:scale-110 transition-transform"
          aria-label="Partager"
        >
          <Share2 className="w-4 h-4 text-gray-800" />
        </button>
        <button
          onClick={() => setFav((f) => !f)}
          className="w-10 h-10 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow hover:scale-110 transition-transform"
          aria-label="Ajouter aux favoris"
        >
          <Heart className={cn('w-4 h-4', fav ? 'fill-primary text-primary' : 'text-gray-800')} />
        </button>
      </div>

      {single ? (
        <button onClick={() => openAt(0)} className="block w-full h-[300px] md:h-[440px] rounded-2xl overflow-hidden group">
          <span className="relative block w-full h-full">
            <Image src={pics[0].url} alt={name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="100vw" priority />
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[300px] md:h-[440px] rounded-2xl overflow-hidden">
          {/* grande photo */}
          <button onClick={() => openAt(0)} className="col-span-2 row-span-2 relative group">
            <Image src={pics[0].url} alt={name} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="50vw" priority />
          </button>
          {/* miniatures */}
          {pics.slice(1, 5).map((p, i) => (
            <button key={i} onClick={() => openAt(i + 1)} className="relative group col-span-1 row-span-1">
              <Image src={p.url} alt={`${name} ${i + 2}`} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="25vw" />
            </button>
          ))}
        </div>
      )}

      {/* Voir toutes les photos */}
      <button
        onClick={() => openAt(0)}
        className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-gray-900 text-sm font-semibold shadow hover:scale-105 transition-transform"
      >
        <Grip className="w-4 h-4" />
        Voir toutes les photos ({pics.length})
      </button>

      <ImageLightbox
        images={pics}
        currentIndex={index}
        isOpen={open}
        onClose={() => setOpen(false)}
        onNext={next}
        onPrevious={prev}
        onGoToIndex={setIndex}
      />
    </div>
  );
}
