<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use App\Models\CorporateAnnualReward;
use App\Models\CorporateCollaborator;
use App\Models\CorporateRewardTier;
use App\Models\User;
use App\Services\CorporateLoyaltyService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

/**
 * Espace "Mon entreprise" du voyageur Corporate (brief Parcours Voyageur, Étapes 21-22) :
 * infos société, collaborateurs autorisés à réserver au nom de l'entreprise, rapport de dépenses.
 */
class CorporateController extends Controller
{
    /**
     * Vue d'ensemble : profil entreprise, rôle du voyageur (responsable ou collaborateur), collaborateurs.
     */
    public function overview(Request $request)
    {
        $user = $request->user();

        $membership = CorporateCollaborator::where('collaborator_user_id', $user->id)
            ->where('status', CorporateCollaborator::STATUS_ACTIVE)
            ->with('owner:id,name,company_name')
            ->first();

        $isOwner = $user->traveler_type === 'corporate' && !$membership;

        $collaborators = $isOwner
            ? CorporateCollaborator::where('owner_id', $user->id)
                ->with('collaboratorUser:id,name,email,avatar')
                ->orderByDesc('created_at')
                ->get()
            : collect();

        return response()->json([
            'is_owner' => $isOwner,
            'is_collaborator' => (bool) $membership,
            'company' => $isOwner ? [
                'company_name' => $user->company_name,
                'company_vat' => $user->company_vat,
                'company_rccm' => $user->company_rccm,
                'company_tax_number' => $user->company_tax_number,
                'company_unique_id' => $user->company_unique_id,
                'company_sector' => $user->company_sector,
                'company_address' => $user->company_address,
                'company_city' => $user->company_city,
                'company_country' => $user->company_country,
                'company_billing_email' => $user->company_billing_email,
            ] : ($membership ? [
                'company_name' => $membership->owner->company_name,
                'owner_name' => $membership->owner->name,
            ] : null),
            'collaborators' => $collaborators,
        ]);
    }

    /**
     * Inviter un collaborateur par e-mail. S'il possède déjà un compte bo séjour, il est
     * immédiatement lié et actif ; sinon une invitation lui est envoyée par e-mail et le
     * lien se fera automatiquement à son inscription (voir AuthController::register).
     */
    public function inviteCollaborator(Request $request)
    {
        $owner = $request->user();
        if ($owner->traveler_type !== 'corporate') {
            return response()->json(['message' => "Réservé aux comptes voyageur Entreprise."], 403);
        }

        $data = $request->validate([
            'email' => 'required|email|max:255',
            'name' => 'nullable|string|max:255',
            'spending_limit' => 'nullable|numeric|min:0',
        ]);

        $existing = CorporateCollaborator::where('owner_id', $owner->id)
            ->where('email', $data['email'])
            ->first();
        if ($existing) {
            return response()->json(['message' => 'Ce collaborateur a déjà été ajouté.'], 422);
        }

        $existingUser = User::where('email', $data['email'])->first();

        $collaborator = CorporateCollaborator::create([
            'owner_id' => $owner->id,
            'collaborator_user_id' => $existingUser?->id,
            'email' => $data['email'],
            'name' => $data['name'] ?? $existingUser?->name,
            'spending_limit' => $data['spending_limit'] ?? null,
            'status' => $existingUser ? CorporateCollaborator::STATUS_ACTIVE : CorporateCollaborator::STATUS_INVITED,
            'invited_at' => now(),
            'accepted_at' => $existingUser ? now() : null,
        ]);

        try {
            Mail::raw(
                "Bonjour,\n\n"
                . ($owner->company_name ?: $owner->name) . " vous a ajouté(e) comme collaborateur sur bo séjour, "
                . "pour réserver des hébergements au nom de l'entreprise.\n\n"
                . ($existingUser
                    ? "Connectez-vous à votre espace bo séjour habituel : vos futures réservations en tant que voyageur d'entreprise seront rattachées à ce compte."
                    : "Créez votre compte bo séjour avec cette adresse e-mail (" . $data['email'] . ") pour être automatiquement rattaché(e) à l'entreprise : "
                        . rtrim(config('services.frontend_url'), '/') . '/auth/register')
                . "\n\nÀ bientôt,\nL'équipe bo séjour",
                function ($message) use ($data) {
                    $message->to($data['email'])->subject('Invitation à rejoindre une entreprise sur bo séjour');
                }
            );
        } catch (\Throwable $e) {
            Log::warning('Corporate collaborator invite email failed', ['error' => $e->getMessage()]);
        }

        return response()->json($collaborator->load('collaboratorUser:id,name,email,avatar'), 201);
    }

    public function updateCollaborator(Request $request, CorporateCollaborator $collaborator)
    {
        $owner = $request->user();
        if ($collaborator->owner_id !== $owner->id) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $data = $request->validate([
            'spending_limit' => 'nullable|numeric|min:0',
            'status' => ['nullable', Rule::in([CorporateCollaborator::STATUS_ACTIVE, CorporateCollaborator::STATUS_SUSPENDED])],
        ]);

        $collaborator->update(array_filter($data, fn ($v) => $v !== null));

        return response()->json($collaborator->fresh()->load('collaboratorUser:id,name,email,avatar'));
    }

    public function removeCollaborator(Request $request, CorporateCollaborator $collaborator)
    {
        $owner = $request->user();
        if ($collaborator->owner_id !== $owner->id) {
            return response()->json(['message' => 'Non autorisé.'], 403);
        }

        $collaborator->delete();

        return response()->json(['message' => 'Collaborateur retiré.']);
    }

    /**
     * Progression du Programme Corporate pour l'année en cours (CA "live", pas
     * encore figé — voir CorporateAnnualReward pour le cliché de fin d'année) :
     * palier atteint, palier suivant et montant restant, plus la récompense de
     * l'année précédente si elle a déjà été figée par
     * corporate:compute-annual-rewards (doc client §13 : "sa progression vers
     * le prochain objectif", "les récompenses estimées").
     */
    public function loyalty(Request $request, CorporateLoyaltyService $corporateLoyaltyService)
    {
        $owner = $request->user();
        if ($owner->traveler_type !== 'corporate') {
            return response()->json(['message' => "Réservé aux comptes voyageur Entreprise."], 403);
        }

        $year = (int) now()->year;
        $revenue = $corporateLoyaltyService->computeAnnualRevenue($owner, $year);
        $currentTier = $corporateLoyaltyService->determineRewardTier($revenue);

        $nextTier = CorporateRewardTier::active()
            ->where('revenue_threshold', '>', $revenue)
            ->orderBy('revenue_threshold')
            ->first();

        $lastYearReward = CorporateAnnualReward::where('owner_id', $owner->id)
            ->where('year', $year - 1)
            ->first();

        return response()->json([
            'year' => $year,
            'revenue_total' => $revenue,
            'current_tier' => $currentTier ? [
                'revenue_threshold' => (float) $currentTier->revenue_threshold,
                'reward_label' => $currentTier->reward_label,
            ] : null,
            'next_tier' => $nextTier ? [
                'revenue_threshold' => (float) $nextTier->revenue_threshold,
                'reward_label' => $nextTier->reward_label,
                'remaining' => (float) $nextTier->revenue_threshold - $revenue,
            ] : null,
            'last_year_reward' => $lastYearReward ? [
                'year' => $lastYearReward->year,
                'revenue_total' => (float) $lastYearReward->revenue_total,
                'reward_label' => $lastYearReward->reward_label,
            ] : null,
        ]);
    }

    /**
     * Rapport de dépenses mensuel : réservations professionnelles du responsable
     * et de ses collaborateurs actifs (brief Étape 22 — rapports de dépenses).
     */
    public function expenses(Request $request)
    {
        $owner = $request->user();
        if ($owner->traveler_type !== 'corporate') {
            return response()->json(['message' => "Réservé aux comptes voyageur Entreprise."], 403);
        }

        $collaboratorIds = CorporateCollaborator::where('owner_id', $owner->id)
            ->where('status', CorporateCollaborator::STATUS_ACTIVE)
            ->whereNotNull('collaborator_user_id')
            ->pluck('collaborator_user_id');

        $userIds = $collaboratorIds->push($owner->id)->unique();

        $months = max(1, min(24, (int) $request->input('months', 6)));
        $since = now()->startOfMonth()->subMonths($months - 1);

        $bookings = Booking::where(function ($q) use ($userIds, $owner) {
                $q->whereIn('user_id', $userIds)->orWhere('corporate_owner_id', $owner->id);
            })
            ->where('traveler_type', 'corporate')
            ->where('created_at', '>=', $since)
            ->with(['accommodation:id,name,city', 'user:id,name,email'])
            ->orderByDesc('created_at')
            ->get();

        $byMonth = $bookings->groupBy(fn ($b) => $b->created_at->format('Y-m'))
            ->map(function ($group, $month) {
                return [
                    'month' => $month,
                    'count' => $group->count(),
                    'total' => (float) $group->sum('total_price'),
                    'paid' => (float) $group->sum('amount_paid'),
                ];
            })->values()->sortByDesc('month')->values();

        return response()->json([
            'total' => (float) $bookings->sum('total_price'),
            'count' => $bookings->count(),
            'by_month' => $byMonth,
            'bookings' => $bookings->map(fn ($b) => [
                'id' => $b->id,
                'confirmation_code' => $b->confirmation_code,
                'accommodation' => $b->accommodation?->only(['id', 'name', 'city']),
                'traveler' => $b->user?->only(['id', 'name', 'email']),
                'check_in' => $b->check_in,
                'check_out' => $b->check_out,
                'total_price' => $b->total_price,
                'amount_paid' => $b->amount_paid,
                'status' => $b->status,
                'company_service' => $b->company_service,
                'company_project' => $b->company_project,
                'created_at' => $b->created_at,
            ]),
        ]);
    }
}
