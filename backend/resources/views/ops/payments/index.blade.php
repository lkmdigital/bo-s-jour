@extends('ops.layouts.app')

@section('title', 'Paiements')
@section('page_title', 'Paiements')

@section('content')
    <div class="flex items-center gap-2 mb-5">
        <a href="{{ route('ops.payments.index', ['status' => 'pending']) }}"
           class="px-4 py-2 rounded-lg text-sm font-semibold border {{ $status === 'pending' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50' }}">
            En attente ({{ $counts['pending'] }})
        </a>
        <a href="{{ route('ops.payments.index', ['status' => 'failed']) }}"
           class="px-4 py-2 rounded-lg text-sm font-semibold border {{ $status === 'failed' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50' }}">
            Échoués ({{ $counts['failed'] }})
        </a>
    </div>

    <div class="ops-card overflow-hidden">
        @if ($payments->isEmpty())
            <p class="p-6 text-sm text-gray-500">Aucun paiement {{ $status === 'pending' ? 'en attente' : 'échoué' }}.</p>
        @else
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            <th class="px-4 py-3">Date</th>
                            <th class="px-4 py-3">Voyageur</th>
                            <th class="px-4 py-3">Établissement</th>
                            <th class="px-4 py-3">Référence</th>
                            <th class="px-4 py-3 text-right">Montant</th>
                            <th class="px-4 py-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($payments as $payment)
                            <tr class="border-b border-gray-100 last:border-0">
                                <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ $payment->created_at->format('d/m/Y H:i') }}</td>
                                <td class="px-4 py-3">
                                    <span class="font-medium">{{ $payment->user?->name ?? '—' }}</span>
                                    @if ($payment->user?->email)
                                        <span class="block text-xs text-gray-400">{{ $payment->user->email }}</span>
                                    @endif
                                </td>
                                <td class="px-4 py-3">{{ $payment->booking?->accommodation?->name ?? '—' }}</td>
                                <td class="px-4 py-3 font-mono text-xs text-gray-500">{{ $payment->payment_reference }}</td>
                                <td class="px-4 py-3 text-right font-semibold whitespace-nowrap">{{ number_format((float) $payment->amount, 0, ',', ' ') }} FCFA</td>
                                <td class="px-4 py-3 text-right">
                                    @if ($payment->transaction_id)
                                        <form method="POST" action="{{ route('ops.payments.reconcile', $payment) }}">
                                            @csrf
                                            <button type="submit" class="ops-btn-outline">Vérifier auprès de Malia Pay</button>
                                        </form>
                                    @else
                                        <span class="text-xs text-gray-400" title="Paiement créé avant la migration vers la nouvelle API Malia Pay">Sans identifiant de transaction</span>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        @endif
    </div>

    <div class="mt-4">
        {{ $payments->links() }}
    </div>
@endsection
