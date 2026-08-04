'use client';

import { Sparkles } from 'lucide-react';
import ComingSoon from '@/components/dashboard/host/ComingSoon';

export default function HostAiAssistantPage() {
  return (
    <ComingSoon
      icon={Sparkles}
      title="Assistant IA"
      description="Un assistant intelligent pour vous aider à optimiser vos tarifs, répondre aux voyageurs et analyser vos performances arrive prochainement."
    />
  );
}
