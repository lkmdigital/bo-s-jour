<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connexion — Ops BoSéjour</title>
    @vite(['resources/css/ops.css', 'resources/js/ops.js'])
</head>
<body class="bg-gray-50 text-gray-900 antialiased min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-sm">
        <div class="text-center mb-6">
            <span class="font-bold text-2xl">bo<span class="text-primary">séjour</span></span>
            <p class="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">Espace Ops — accès administrateur</p>
        </div>

        <div class="ops-card p-6">
            @if ($errors->any())
                <div class="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                    {{ $errors->first() }}
                </div>
            @endif

            <form method="POST" action="{{ route('ops.login.submit') }}" class="space-y-4">
                @csrf
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                    <input id="email" name="email" type="email" required autofocus value="{{ old('email') }}" class="ops-input">
                </div>
                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                    <input id="password" name="password" type="password" required class="ops-input">
                </div>
                <label class="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" name="remember" class="rounded border-gray-300 text-primary focus:ring-primary/40">
                    Rester connecté
                </label>
                <button type="submit" class="ops-btn-primary w-full justify-center">Se connecter</button>
            </form>
        </div>

        <p class="text-center text-xs text-gray-400 mt-4">Réservé aux comptes administrateur BoSéjour.</p>
    </div>
</body>
</html>
