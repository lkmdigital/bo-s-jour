<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ReferralPartner;
use App\Models\User;
use App\Services\PartnerReferralService;
use App\Services\ReferralCode;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Super Admin > Parrainage Partenaires : désigner un membre comme ambassadeur, lui donner un code, l'activer ou le
 * suspendre, et lire ses chiffres (clics, inscriptions, réservations, points).
 */
class AdminReferralPartnerController extends Controller
{
    public function __construct(private PartnerReferralService $service) {}

    public function index()
    {
        $partners = ReferralPartner::with('user:id,name,email')->orderByDesc('id')->get()
            ->map(fn (ReferralPartner $p) => $this->present($p));

        return response()->json(['data' => $partners]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'display_name' => 'nullable|string|max:255',
            'code' => ['nullable', 'string', 'regex:/^[A-Za-z0-9]{4,20}$/'],
        ]);

        $user = User::where('email', $data['email'])->first();
        if (!$user || $user->role !== 'user' || $user->is_guest) {
            throw ValidationException::withMessages(['email' => ["Aucun compte membre n'existe avec cet e-mail. L'ambassadeur doit d'abord créer son compte voyageur."]]);
        }
        if (ReferralPartner::where('user_id', $user->id)->exists()) {
            throw ValidationException::withMessages(['email' => ['Ce membre est déjà ambassadeur.']]);
        }

        $code = PartnerReferralService::normalize($data['code'] ?? '');
        if ($code === '') {
            $code = ReferralCode::generate();   // déjà garanti libre (membres et ambassadeurs)
        } elseif (!PartnerReferralService::codeAvailable($code)) {
            throw ValidationException::withMessages(['code' => ['Ce code est déjà utilisé.']]);
        }

        $partner = ReferralPartner::create([
            'user_id' => $user->id,
            'code' => $code,
            'display_name' => $data['display_name'] ?? null,
            'created_by_user_id' => $request->user()->id,
        ]);

        return response()->json(['data' => $this->present($partner->load('user:id,name,email'))], 201);
    }

    public function update(Request $request, int $id)
    {
        $partner = ReferralPartner::findOrFail($id);
        $data = $request->validate([
            'display_name' => 'nullable|string|max:255',
            'is_active' => 'sometimes|boolean',
        ]);

        $partner->update($data);

        return response()->json(['data' => $this->present($partner->load('user:id,name,email'))]);
    }

    private function present(ReferralPartner $p): array
    {
        return [
            'id' => $p->id,
            'code' => $p->code,
            'display_name' => $p->display_name,
            'is_active' => $p->is_active,
            'created_at' => $p->created_at?->toIso8601String(),
            'user' => ['id' => $p->user?->id, 'name' => $p->user?->name, 'email' => $p->user?->email],
            'link' => $this->service->shortLink($p),
            'stats' => $this->service->stats($p),
        ];
    }
}
