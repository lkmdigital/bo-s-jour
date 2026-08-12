'use client';

import { TrendingDestinations, TopSites, Activities } from '@/components/home/sections';

export default function MemberDiscoverPage() {
  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      <div className="px-4 sm:px-6 lg:px-8 pt-2">
        <h1 className="text-3xl font-bold">Découvrir la Côte d&apos;Ivoire</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Destinations, sites et activités à explorer pendant votre séjour.</p>
      </div>
      <TrendingDestinations />
      <TopSites />
      <Activities />
    </div>
  );
}
