<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Facades\Validator;

class OAuthController extends Controller
{
    /**
     * Rediriger vers le fournisseur OAuth
     */
    public function redirect($provider)
    {
        $this->validateProvider($provider);

        if ($provider === 'microsoft') {
            return Socialite::driver('microsoft')
                ->scopes(['openid', 'profile', 'email'])
                ->redirect();
        }

        return Socialite::driver($provider)
            ->redirect();
    }

    /**
     * Gérer le callback OAuth
     */
    public function callback(Request $request, $provider)
    {
        $this->validateProvider($provider);

        try {
            if ($provider === 'microsoft') {
                $oauthUser = Socialite::driver('microsoft')
                    ->scopes(['openid', 'profile', 'email'])
                    ->user();
            } else {
                $oauthUser = Socialite::driver($provider)->user();
            }

            // Vérifier que l'email est disponible
            if (!$oauthUser->getEmail()) {
                return response()->json([
                    'message' => 'Impossible de récupérer l\'email depuis le compte OAuth.',
                ], 400);
            }

            // Chercher un utilisateur existant par email ou par ID OAuth
            $user = User::where('email', $oauthUser->getEmail())
                ->orWhere(function($query) use ($provider, $oauthUser) {
                    if ($provider === 'google') {
                        $query->where('google_id', $oauthUser->getId());
                    } elseif ($provider === 'microsoft') {
                        $query->where('microsoft_id', $oauthUser->getId());
                    }
                })
                ->first();

            if ($user) {
                // Mettre à jour les informations OAuth si nécessaire
                if ($provider === 'google' && !$user->google_id) {
                    $user->google_id = $oauthUser->getId();
                    $user->oauth_provider = 'google';
                } elseif ($provider === 'microsoft' && !$user->microsoft_id) {
                    $user->microsoft_id = $oauthUser->getId();
                    $user->oauth_provider = 'microsoft';
                }

                // Mettre à jour l'avatar si disponible
                if ($oauthUser->getAvatar() && !$user->avatar) {
                    $user->avatar = $oauthUser->getAvatar();
                }

                $user->email_verified_at = $user->email_verified_at ?? now();
                $user->save();
            } else {
                // Créer un nouvel utilisateur
                $user = User::create([
                    'name' => $oauthUser->getName() ?? $oauthUser->getNickname() ?? 'Utilisateur',
                    'email' => $oauthUser->getEmail(),
                    'password' => Hash::make(Str::random(32)), // Mot de passe aléatoire (l'utilisateur ne l'utilisera jamais)
                    'role' => 'user',
                    'status' => 'active',
                    'google_id' => $provider === 'google' ? $oauthUser->getId() : null,
                    'microsoft_id' => $provider === 'microsoft' ? $oauthUser->getId() : null,
                    'oauth_provider' => $provider,
                    'avatar' => $oauthUser->getAvatar(),
                    'email_verified_at' => now(), // Email vérifié via OAuth
                ]);
            }

            // Logger la connexion OAuth réussie
            Log::channel('security')->info('OAuth login successful', [
                'user_id' => $user->id,
                'email' => $user->email,
                'provider' => $provider,
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'timestamp' => now()->toIso8601String(),
            ]);

            // Enregistrer les informations de connexion
            $user->update([
                'last_login_at' => now(),
                'last_login_ip' => $request->ip(),
                'login_count' => ($user->login_count ?? 0) + 1,
            ]);

            // Charger les rôles RBAC
            $user->load('roles');

            // Créer le token d'authentification
            $token = $user->createToken('auth_token')->plainTextToken;

            // Rediriger vers le frontend avec les données d'authentification
            $frontendUrl = config('app.frontend_url', env('FRONTEND_URL', 'https://monbeaupays.loyerpay.ci'));
            $redirectUrl = $frontendUrl . '/auth/oauth-callback?' . http_build_query([
                'token' => $token,
                'user' => json_encode($user),
                'provider' => $provider,
            ]);

            return redirect($redirectUrl);

        } catch (\Exception $e) {
            Log::channel('security')->error('OAuth login failed', [
                'provider' => $provider,
                'error' => $e->getMessage(),
                'ip' => $request->ip(),
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'message' => 'Erreur lors de l\'authentification OAuth. Veuillez réessayer.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    /**
     * Valider le fournisseur OAuth
     */
    protected function validateProvider($provider)
    {
        if (!in_array($provider, ['google', 'microsoft'])) {
            abort(404, 'Provider not supported');
        }
    }

    /**
     * Lier un compte OAuth à un compte existant
     */
    public function link(Request $request, $provider)
    {
        $this->validateProvider($provider);

        $user = $request->user();
        
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        try {
            if ($provider === 'microsoft') {
                $oauthUser = Socialite::driver('microsoft')
                    ->scopes(['openid', 'profile', 'email'])
                    ->user();
            } else {
                $oauthUser = Socialite::driver($provider)->user();
            }

            // Vérifier que l'email OAuth correspond à l'email de l'utilisateur connecté
            if ($oauthUser->getEmail() !== $user->email) {
                return response()->json([
                    'message' => 'L\'email du compte OAuth ne correspond pas à votre compte.',
                ], 422);
            }

            // Vérifier si ce compte OAuth est déjà lié à un autre utilisateur
            $existingUser = User::where(function($query) use ($provider, $oauthUser) {
                if ($provider === 'google') {
                    $query->where('google_id', $oauthUser->getId());
                } elseif ($provider === 'microsoft') {
                    $query->where('microsoft_id', $oauthUser->getId());
                }
            })->where('id', '!=', $user->id)->first();

            if ($existingUser) {
                return response()->json([
                    'message' => 'Ce compte OAuth est déjà lié à un autre utilisateur.',
                ], 422);
            }

            // Lier le compte OAuth
            if ($provider === 'google') {
                $user->google_id = $oauthUser->getId();
            } elseif ($provider === 'microsoft') {
                $user->microsoft_id = $oauthUser->getId();
            }

            if (!$user->oauth_provider) {
                $user->oauth_provider = $provider;
            }

            // Mettre à jour l'avatar si disponible
            if ($oauthUser->getAvatar() && !$user->avatar) {
                $user->avatar = $oauthUser->getAvatar();
            }

            $user->save();

            Log::channel('security')->info('OAuth account linked', [
                'user_id' => $user->id,
                'provider' => $provider,
                'ip' => $request->ip(),
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'message' => 'Compte OAuth lié avec succès.',
                'user' => $user->load('roles'),
            ]);

        } catch (\Exception $e) {
            Log::channel('security')->error('OAuth link failed', [
                'user_id' => $user->id,
                'provider' => $provider,
                'error' => $e->getMessage(),
                'ip' => $request->ip(),
                'timestamp' => now()->toIso8601String(),
            ]);

            return response()->json([
                'message' => 'Erreur lors de la liaison du compte OAuth.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }
}
