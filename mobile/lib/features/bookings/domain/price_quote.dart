import '../../../core/json.dart';

/// Une façon de payer proposée au voyageur après la confirmation de l'hôte.
class PayOption {
  const PayOption({required this.label, required this.amount, this.originalAmount, this.discountPercent, this.summary, this.balanceAtHotel});

  final String label;
  final num amount;
  final num? originalAmount;
  final num? discountPercent;
  final String? summary;
  final num? balanceAtHotel;

  factory PayOption.fromJson(Map<String, dynamic> json) => PayOption(
        label: toText(json['label']) ?? '',
        amount: toNum(json['amount']) ?? 0,
        originalAmount: toNum(json['original_amount']),
        discountPercent: toNum(json['discount_percent']),
        summary: toText(json['summary']),
        balanceAtHotel: toNum(json['balance_at_hotel']),
      );
}

/// Les façons de payer annoncées par le serveur : tout de suite (souvent avec une remise) ou garantie de réservation.
class PaymentOptions {
  const PaymentOptions({this.full, this.guarantee, this.fullOnly = false});

  final PayOption? full;
  final PayOption? guarantee;

  /// Le paiement intégral est obligatoire (la garantie n'est pas proposée).
  final bool fullOnly;

  factory PaymentOptions.fromJson(Object? json) {
    final options = json is Map<String, dynamic> ? json : const <String, dynamic>{};
    final list = options['options'] is Map<String, dynamic> ? (options['options'] as Map<String, dynamic>) : const <String, dynamic>{};

    return PaymentOptions(
      full: list['full'] is Map<String, dynamic> ? PayOption.fromJson(list['full'] as Map<String, dynamic>) : null,
      guarantee: list['guarantee'] is Map<String, dynamic> ? PayOption.fromJson(list['guarantee'] as Map<String, dynamic>) : null,
      fullOnly: toBool(options['full_only']),
    );
  }
}

/// Remise d'invitation (ambassadeur) calculée par le serveur : un montant, ou une erreur à montrer au voyageur.
class ReferralDiscount {
  const ReferralDiscount({this.amount, this.percent, this.label, this.error});

  final num? amount;
  final num? percent;
  final String? label;
  final String? error;

  factory ReferralDiscount.fromJson(Map<String, dynamic> json) =>
      ReferralDiscount(amount: toNum(json['amount']), percent: toNum(json['percent']), label: toText(json['label']), error: toText(json['error']));
}

class LongStayDiscount {
  const LongStayDiscount({required this.label, required this.amount});

  final String label;
  final num amount;
}

/// Devis d'un séjour (réponse de GET /accommodations/{id}/price-preview). Tous les montants viennent du serveur :
/// l'appli n'en calcule aucun.
class PriceQuote {
  const PriceQuote({
    required this.nights,
    required this.pricePerNight,
    required this.total,
    required this.extraBreakfastTotal,
    this.longStay,
    this.referral,
    this.options = const PaymentOptions(),
    this.cancellationHours,
  });

  final int nights;
  final num pricePerNight;

  /// Total du séjour (chambres × nuits), avant petits-déjeuners et remise d'invitation.
  final num total;
  final num extraBreakfastTotal;
  final LongStayDiscount? longStay;
  final ReferralDiscount? referral;
  final PaymentOptions options;
  final int? cancellationHours;

  PayOption? get full => options.full;
  PayOption? get guarantee => options.guarantee;
  bool get fullOnly => options.fullOnly;

  /// Remise d'invitation effectivement appliquée (0 si elle est absente ou refusée).
  num get referralAmount => referral?.error == null ? (referral?.amount ?? 0) : 0;

  /// Total à payer, remise d'invitation déduite (le même que celui du serveur à la création).
  num get payable => (total + extraBreakfastTotal - referralAmount).clamp(0, double.infinity);

  factory PriceQuote.fromJson(Map<String, dynamic> json) {
    final longStay = json['long_stay_discount'];
    final referral = json['referral_discount'];

    return PriceQuote(
      nights: toInt(json['nights']) ?? 0,
      pricePerNight: toNum(json['effective_price_per_night']) ?? 0,
      total: toNum(json['total']) ?? 0,
      extraBreakfastTotal: toNum(json['extra_breakfast_total']) ?? 0,
      longStay: longStay is Map<String, dynamic> ? LongStayDiscount(label: toText(longStay['label']) ?? '', amount: toNum(longStay['discount_amount']) ?? 0) : null,
      referral: referral is Map<String, dynamic> ? ReferralDiscount.fromJson(referral) : null,
      options: PaymentOptions.fromJson(json['payment_options']),
      cancellationHours: toInt(json['cancellation_policy_hours']),
    );
  }
}

/// Paramètres d'un devis ; sert aussi de clé de cache (deux devis identiques ne sont demandés qu'une fois).
class QuoteParams {
  const QuoteParams({required this.accommodationId, required this.checkIn, required this.checkOut, this.roomId, this.rooms = 1, this.referralCode});

  final int accommodationId;
  final DateTime checkIn;
  final DateTime checkOut;
  final int? roomId;
  final int rooms;
  final String? referralCode;

  @override
  bool operator ==(Object other) =>
      other is QuoteParams && other.accommodationId == accommodationId && other.checkIn == checkIn && other.checkOut == checkOut && other.roomId == roomId && other.rooms == rooms && other.referralCode == referralCode;

  @override
  int get hashCode => Object.hash(accommodationId, checkIn, checkOut, roomId, rooms, referralCode);
}
