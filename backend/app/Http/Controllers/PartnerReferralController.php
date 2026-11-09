<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\PartnerReferralService;
use Illuminate\Http\Request;

/** Routes publiques du parrainage ambassadeur : comptage d'un clic / scan, et reconnaissance d'un code à l'inscription. */
class PartnerReferralController extends Controller
{
    public function __construct(private PartnerReferralService $service) {}

    /**
     * Appelé par la page /p/{code} (ouverte par le QR code ou le lien court) dans le navigateur du visiteur : l'IP et
     * le navigateur vus ici sont les siens. Un aperçu de lien (WhatsApp, Facebook) n'exécute pas la page : il n'est pas compté.
     */
    public function click(Request $request)
    {
        $data = $request->validate(['code' => 'required|string|max:20']);

        $partner = $this->service->resolve($data['code']);
        if (!$partner) {
            return response()->json(['valid' => false], 404);
        }

        $this->service->recordClick($partner, $request->ip(), $request->userAgent());

        return response()->json(['valid' => true, 'redirect' => $this->service->registerPath($partner)]);
    }

    /** Dit au formulaire d'inscription si un code est reconnu, et de quel type (ambassadeur ou membre). */
    public function resolve(string $code)
    {
        $partner = $this->service->resolve($code);
        if ($partner) {
            return response()->json(['valid' => true, 'type' => 'partner', 'label' => $partner->display_name]);
        }

        $isMemberCode = User::where('referral_code', PartnerReferralService::normalize($code))->exists();

        return response()->json(['valid' => $isMemberCode, 'type' => $isMemberCode ? 'member' : null, 'label' => null]);
    }
}
