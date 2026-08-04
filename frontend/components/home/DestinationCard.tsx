'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

export interface DestinationCardData {
  name: string;
  image: string;
  fromPrice: number;
  tagline?: string;
  href?: string;
}

export default function DestinationCard({ data }: { data: DestinationCardData }) {
  return (
    <Link
      href={data.href || '/accommodations'}
      className="group relative block h-[440px] rounded-2xl overflow-hidden shadow-md"
    >
      <Image
        src={data.image}
        alt={data.name}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        sizes="(max-width: 768px) 100vw, 25vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
        <h3 className="text-2xl font-bold">{data.name}</h3>
        <p className="mt-1 text-sm">
          À partir de <span className="text-[#F7C948] font-semibold">{formatPrice(data.fromPrice)} fcfa/nuit</span>
        </p>
        {data.tagline && <p className="mt-1 text-sm text-white/80">{data.tagline}</p>}
      </div>
    </Link>
  );
}
