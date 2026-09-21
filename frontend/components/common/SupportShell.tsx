import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';

export default function SupportShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-10 sm:py-14 max-w-4xl">
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">{title}</h1>
        {intro && <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-2xl">{intro}</p>}
        {children}
      </main>
      <Footer />
    </div>
  );
}
