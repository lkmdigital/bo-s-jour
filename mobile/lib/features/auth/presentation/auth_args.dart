import '../data/auth_repository.dart';

/// Données passées d'un écran d'authentification au suivant (via `extra` de go_router).
class OtpArgs {
  const OtpArgs({required this.userId, required this.email, this.signup = false, this.referral});

  final int userId;
  final String email;

  /// Vrai juste après la création du compte : le code validé mène à l'écran de bienvenue.
  final bool signup;

  /// Invitation reconnue à l'inscription (affichée sur l'écran de bienvenue).
  final ReferralInfo? referral;
}

class WelcomeArgs {
  const WelcomeArgs({this.referral});

  final ReferralInfo? referral;
}
