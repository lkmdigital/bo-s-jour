import '../../../core/config/app_config.dart';
import '../../../core/json.dart';

/// Moyen de paiement proposé par la plateforme (GET /payment-methods) : Wave, Orange Money, MTN, carte, Djamo…
class PaymentMethodInfo {
  const PaymentMethodInfo({required this.slug, required this.name, this.description, this.iconUrl});

  final String slug;
  final String name;
  final String? description;
  final String? iconUrl;

  /// MTN : pas de page à ouvrir, le client valide sur son téléphone.
  bool get isPush => slug == 'mtn-ci';

  factory PaymentMethodInfo.fromJson(Map<String, dynamic> json) {
    final icon = toText(json['icon']);

    return PaymentMethodInfo(
      slug: toText(json['slug']) ?? '',
      name: toText(json['name']) ?? '',
      description: toText(json['description']),
      iconUrl: icon == null ? null : (icon.startsWith('http') ? icon : '${AppConfig.siteUrl}${icon.startsWith('/') ? '' : '/'}$icon'),
    );
  }
}

enum PaymentPlan { full, guarantee }

/// Réponse de l'initiation d'un paiement : une page de passerelle à ouvrir, ou une validation à faire sur le téléphone.
class PaymentInitiation {
  const PaymentInitiation({required this.paymentId, this.link, this.awaitingPhone = false, this.requiresOtp = false});

  final int paymentId;
  final String? link;
  final bool awaitingPhone;
  final bool requiresOtp;
}

enum PaymentState { pending, completed, failed }

PaymentState paymentStateOf(String? status) => switch (status) {
      'completed' => PaymentState.completed,
      'failed' => PaymentState.failed,
      _ => PaymentState.pending,
    };
