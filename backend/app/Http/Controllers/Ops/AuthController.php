<?php

namespace App\Http\Controllers\Ops;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    public function showLogin()
    {
        if (Auth::guard('web')->check() && Auth::guard('web')->user()->isAdmin()) {
            return redirect()->route('ops.dashboard');
        }

        return view('ops.auth.login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ], [], ['email' => 'e-mail', 'password' => 'mot de passe']);

        $throttleKey = 'ops-login:' . $request->ip();
        if (\Illuminate\Support\Facades\RateLimiter::tooManyAttempts($throttleKey, 6)) {
            $seconds = \Illuminate\Support\Facades\RateLimiter::availableIn($throttleKey);
            return back()->withErrors(['email' => "Trop de tentatives. Réessayez dans {$seconds} secondes."])->onlyInput('email');
        }

        $credentials = $request->only('email', 'password');

        if (!Auth::guard('web')->attempt($credentials, $request->boolean('remember'))) {
            \Illuminate\Support\Facades\RateLimiter::hit($throttleKey, 60);
            return back()->withErrors(['email' => 'Identifiants incorrects.'])->onlyInput('email');
        }

        $user = Auth::guard('web')->user();

        if (!$user->isAdmin()) {
            Auth::guard('web')->logout();
            return back()->withErrors(['email' => 'Accès réservé aux administrateurs.'])->onlyInput('email');
        }

        \Illuminate\Support\Facades\RateLimiter::clear($throttleKey);
        $request->session()->regenerate();

        Log::info('Ops : connexion admin', ['user_id' => $user->id, 'email' => $user->email, 'ip' => $request->ip()]);

        return redirect()->intended(route('ops.dashboard'));
    }

    public function logout(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('ops.login');
    }
}
