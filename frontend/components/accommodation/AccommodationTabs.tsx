'use client';

import { useEffect, useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
}

interface Props {
  tabs: TabItem[];
}

export default function AccommodationTabs({ tabs }: Props) {
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-140px 0px -60% 0px', threshold: 0 }
    );
    const elements = tabs
      .map((t) => document.getElementById(t.id))
      .filter((el): el is HTMLElement => !!el);
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tabs]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 136;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  return (
    <div className="sticky top-20 z-30 -mx-4 px-4 bg-white/95 dark:bg-gray-950/95 backdrop-blur border-b border-gray-200 dark:border-gray-800">
      <nav className="flex gap-6 overflow-x-auto max-w-6xl mx-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => scrollTo(t.id)}
            className={`relative flex-shrink-0 py-4 text-sm font-semibold whitespace-nowrap transition-colors ${
              active === t.id
                ? 'text-primary'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {t.label}
            {active === t.id && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary rounded-full" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
