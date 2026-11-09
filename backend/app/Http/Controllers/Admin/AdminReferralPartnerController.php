<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReferralPartner;
use App\Models\User;
use App\Services\PartnerReferralReport;
use App\Services\PartnerReferralService;
use App\Services\ReferralCode;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Super Admin > Parrainage Partenaires : désigner un ambassadeur (membre existant, ou pas encore inscrit : désigné par son
 * e-mail ou son numéro WhatsApp), lui donner un code, l'activer ou le suspendre, et lire ses chiffres.
 */
class AdminReferralPartnerController extends Controller
{
    public function __construct(private PartnerReferralService $service) {}

    public function index()
    {
        $partners = ReferralPartner::with('user:id,name,email,phone')->orderByDesc('id')->get()
            ->map(fn (ReferralPartner $p) => $this->present($p));

        return response()->json(['data' => $partners]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'email' => 'nullable|email|max:255|required_without:phone',
            'phone' => 'nullable|string|max:30|required_without:email',
            'display_name' => 'nullable|string|max:255',
            'code' => ['nullable', 'string', 'regex:/^[A-Za-z0-9]{4,20}$/'],
        ], [
            'email.required_without' => "Indiquez l'e-mail ou le numéro WhatsApp de l'ambassadeur.",
            'phone.required_without' => "Indiquez l'e-mail ou le numéro WhatsApp de l'ambassadeur.",
        ]);

        $email = isset($data['email']) ? strtolower(trim($data['email'])) : null;
        $phone = isset($data['phone']) ? trim($data['phone']) : null;
        $phoneKey = PartnerReferralService::phoneKey($phone);
        if ($phone && !$phoneKey) {
            throw ValidationException::withMessages(['phone' => ['Ce numéro semble incomplet (8 chiffres au minimum).']]);
        }

        // Déjà un compte avec ces coordonnées : on le rattache tout de suite. Un compte hôte, administrateur ou invité ne peut pas.
        $member = $this->service->findMember($email, $phone);
        if (!$member && $email && User::where('email', $email)->exists()) {
            throw ValidationException::withMessages(['email' => ["Cet e-mail appartient à un compte qui n'est pas un compte voyageur : un ambassadeur doit être un membre voyageur."]]);
        }
        if ($member && ReferralPartner::where('user_id', $member->id)->exists()) {
            throw ValidationException::withMessages(['email' => ['Ce membre est déjà ambassadeur.']]);
        }
        if (!$member) {
            $duplicate = ReferralPartner::whereNull('user_id')
                ->where(fn ($q) => $q->when($email, fn ($q2) => $q2->where('invited_email', $email))
                    ->when($phoneKey, fn ($q2) => $q2->orWhere('invited_phone_key', $phoneKey)))
                ->exists();
            if ($duplicate) {
                throw ValidationException::withMessages(['email' => ['Un ambassadeur est déjà désigné avec cet e-mail ou ce numéro.']]);
            }
        }

        $code = PartnerReferralService::normalize($data['code'] ?? '');
        if ($code === '') {
            $code = ReferralCode::generate();   // déjà garanti libre (membres et ambassadeurs)
        } elseif (!PartnerReferralService::codeAvailable($code)) {
            throw ValidationException::withMessages(['code' => ['Ce code est déjà utilisé.']]);
        }

        $partner = ReferralPartner::create([
            'user_id' => $member?->id,
            'invited_email' => $member ? null : $email,
            'invited_phone' => $member ? null : $phone,
            'invited_phone_key' => $member ? null : $phoneKey,
            'claimed_at' => $member ? now() : null,
            'code' => $code,
            'display_name' => $data['display_name'] ?? null,
            'created_by_user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->present($partner->load('user:id,name,email,phone'))], 201);
    }

    /** Fiche complète : identité, performance, évolution, filleuls, réservations générées, points et journal. */
    public function show(Request $request, int $id)
    {
        $partner = ReferralPartner::with('user:id,name,email,phone')->findOrFail($id);

        return response()->json([
            'data' => $this->present($partner) + [
                'notes' => $partner->notes,
                'created_by' => $partner->createdBy?->name,
                'poster_name' => $partner->display_name ?: ($partner->user?->name ?? 'boséjour'),
                'discount_percent' => PartnerReferralService::discountPercent(),
                'report' => app(PartnerReferralReport::class)->build($partner, (int) $request->query('days', 30)),
            ],
        ]);
    }

    public function update(Request $request, int $id)
    {
        $partner = ReferralPartner::findOrFail($id);
        $data = $request->validate([
            'display_name' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:5000',
            'is_active' => 'sometimes|boolean',
            // Coordonnées d'un ambassadeur qui n'a pas encore de compte (corriger une faute de frappe dans l'e-mail ou le numéro).
            'invited_email' => 'sometimes|nullable|email|max:255',
            'invited_phone' => 'sometimes|nullable|string|max:30',
        ]);

        if ($partner->user_id && (array_key_exists('invited_email', $data) || array_key_exists('invited_phone', $data))) {
            throw ValidationException::withMessages(['invited_email' => ["Cet ambassadeur a déjà un compte : ses coordonnées ne se modifient plus ici."]]);
        }
        if (array_key_exists('invited_email', $data)) {
            $data['invited_email'] = $data['invited_email'] ? strtolower(trim($data['invited_email'])) : null;
        }
        if (array_key_exists('invited_phone', $data)) {
            $key = PartnerReferralService::phoneKey($data['invited_phone']);
            if ($data['invited_phone'] && !$key) {
                throw ValidationException::withMessages(['invited_phone' => ['Ce numéro semble incomplet (8 chiffres au minimum).']]);
            }
            $data['invited_phone_key'] = $key;
        }
        $after = array_merge($partner->only(['invited_email', 'invited_phone_key']), $data);
        if (!$partner->user_id && empty($after['invited_email']) && empty($after['invited_phone_key'])) {
            throw ValidationException::withMessages(['invited_email' => ["Gardez au moins l'e-mail ou le numéro WhatsApp de l'ambassadeur."]]);
        }

        $partner->update($data);

        return response()->json(['data' => $this->present($partner->load('user:id,name,email,phone'))]);
    }

    private function present(ReferralPartner $p): array
    {
        return [
            'id' => $p->id,
            'code' => $p->code,
            'display_name' => $p->display_name,
            'is_active' => $p->is_active,
            'created_at' => $p->created_at?->toIso8601String(),
            // « pending » : désigné avant son inscription, il retrouvera tout dès qu'un compte vérifié porte cet e-mail ou ce numéro.
            'status' => $p->user_id ? 'active_account' : 'pending_account',
            'claimed_at' => $p->claimed_at?->toIso8601String(),
            'invited_email' => $p->invited_email,
            'invited_phone' => $p->invited_phone,
            'user' => $p->user ? ['id' => $p->user->id, 'name' => $p->user->name, 'email' => $p->user->email, 'phone' => $p->user->phone] : null,
            'link' => $this->service->shortLink($p),
            'qr_link' => $this->service->qrLink($p),
            'stats' => $this->service->stats($p),
        ];
    }
}
