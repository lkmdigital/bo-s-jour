<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'Ops') — BoSéjour</title>
    @vite(['resources/css/ops.css', 'resources/js/ops.js'])
</head>
<body class="bg-gray-50 text-gray-900 antialiased">
    <div class="flex min-h-screen">
        {{-- Barre latérale --}}
        <aside class="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
            <div class="h-16 flex items-center px-5 border-b border-gray-200">
                <span class="font-bold text-lg">bo<span class="text-primary">séjour</span></span>
                <span class="ml-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Ops</span>
            </div>
            <nav class="flex-1 px-3 py-4 space-y-1">
                <a href="{{ route('ops.dashboard') }}" class="ops-nav-link {{ request()->routeIs('ops.dashboard') ? 'is-active' : '' }}">
                    <span>Vue d'ensemble</span>
                </a>
                <a href="{{ route('ops.payments.index') }}" class="ops-nav-link {{ request()->routeIs('ops.payments.*') ? 'is-active' : '' }}">
                    <span>Paiements</span>
                </a>
                <span class="ops-nav-link opacity-50 cursor-not-allowed" title="À venir">
                    <span>Réservations &amp; litiges</span>
                    <span class="ml-auto text-[10px] font-semibold uppercase tracking-wide text-gray-400">Bientôt</span>
                </span>
                <span class="ops-nav-link opacity-50 cursor-not-allowed" title="À venir">
                    <span>Technique (logs, jobs)</span>
                    <span class="ml-auto text-[10px] font-semibold uppercase tracking-wide text-gray-400">Bientôt</span>
                </span>
            </nav>
            <div class="p-3 border-t border-gray-200">
                <form method="POST" action="{{ route('ops.logout') }}">
                    @csrf
                    <button type="submit" class="ops-nav-link w-full text-left">
                        <span>Déconnexion</span>
                    </button>
                </form>
            </div>
        </aside>

        {{-- Contenu --}}
        <div class="flex-1 min-w-0">
            <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
                <h1 class="text-lg font-bold">@yield('page_title', 'Ops')</h1>
                <span class="text-sm text-gray-500">{{ auth('web')->user()?->name }}</span>
            </header>

            <main class="p-6">
                @if (session('ops_success'))
                    <div data-flash class="mb-4 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                        {{ session('ops_success') }}
                    </div>
                @endif
                @if (session('ops_error'))
                    <div data-flash class="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                        {{ session('ops_error') }}
                    </div>
                @endif

                @yield('content')
            </main>
        </div>
    </div>
</body>
</html>
