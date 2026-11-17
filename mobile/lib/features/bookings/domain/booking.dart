import '../../../core/json.dart';
import '../../accommodations/domain/accommodation.dart';
import 'price_quote.dart';

enum BookingStatus { awaitingHost, pending, confirmed, cancelled, completed }

/// Réservation du voyageur (réponse de GET /bookings et GET /bookings/{id}).
class Booking {
  const Booking({
    required this.id,
    required this.status,
    required this.checkIn,
    required this.checkOut,
    required this.guests,
    required this.totalPrice,
    required this.accommodationName,
    this.accommodationId,
    this.city,
    this.imageUrl,
    this.roomName,
    this.paymentStatus,
    this.paymentType,
    this.depositAmount,
    this.amountPaid,
    this.confirmationCode,
    this.bookingNumber,
    this.accessToken,
    this.wasModified = false,
    this.expiresAt,
    this.isNonRefundable = false,
    this.cancellationHours,
    this.specialRequests,
    this.refundAmount,
    this.creditAmount,
    this.paymentOptions,
  });

  final int id;
  final BookingStatus status;
  final DateTime checkIn;
  final DateTime checkOut;
  final int guests;
  final num totalPrice;
  final String accommodationName;
  final int? accommodationId;
  final String? city;
  final String? imageUrl;
  final String? roomName;
  final String? paymentStatus; // pending | paid | failed | refunded
  final String? paymentType; // full | guarantee
  final num? depositAmount;
  final num? amountPaid;
  final String? confirmationCode;
  final String? bookingNumber;
  final String? accessToken;
  final bool wasModified;
  final DateTime? expiresAt;
  final bool isNonRefundable;
  final int? cancellationHours;
  final String? specialRequests;
  final num? refundAmount;
  final num? creditAmount;

  /// Montants à régler annoncés par le serveur (présents dans le détail d'une réservation).
  final PaymentOptions? paymentOptions;

  int get nights => checkOut.difference(checkIn).inDays;

  bool isFuture(DateTime now) => !checkOut.isBefore(DateTime(now.year, now.month, now.day));

  /// Le voyageur peut payer : l'hôte a confirmé, le paiement n'est pas encore fait.
  bool needsPayment(DateTime now) => status == BookingStatus.pending && paymentStatus == 'pending' && isFuture(now);

  bool canCancel(DateTime now) => (status == BookingStatus.awaitingHost || status == BookingStatus.pending || status == BookingStatus.confirmed) && isFuture(now);

  /// Onglet : annulée, passée (terminée ou séjour fini) ou à venir.
  BookingTab tab(DateTime now) {
    if (status == BookingStatus.cancelled) return BookingTab.cancelled;
    if (status == BookingStatus.completed || !isFuture(now)) return BookingTab.past;

    return BookingTab.upcoming;
  }

  /// Annulation gratuite possible : l'arrivée est plus loin que le délai de l'établissement.
  bool freeCancellation(DateTime now) => cancellationHours == null || checkIn.isAfter(now.add(Duration(hours: cancellationHours!)));

  factory Booking.fromJson(Map<String, dynamic> json) {
    final accommodation = json['accommodation'] is Map<String, dynamic> ? json['accommodation'] as Map<String, dynamic> : const <String, dynamic>{};
    final room = json['room'] is Map<String, dynamic> ? json['room'] as Map<String, dynamic> : const <String, dynamic>{};
    final images = accommodation['images'];
    String? image;
    if (images is List && images.isNotEmpty) {
      final list = images.whereType<Map>().toList();
      final primary = list.firstWhere((i) => toBool(i['is_primary']), orElse: () => list.first);
      image = resolveImageUrl(toText(primary['url']));
    }

    return Booking(
      id: (json['id'] as num).toInt(),
      status: _status(json['status'] as String?),
      checkIn: _date(json['check_in']),
      checkOut: _date(json['check_out']),
      guests: toInt(json['guests']) ?? 1,
      totalPrice: toNum(json['total_price']) ?? 0,
      accommodationName: toText(accommodation['name']) ?? '',
      accommodationId: toInt(accommodation['id']) ?? toInt(json['accommodation_id']),
      city: toText(accommodation['city']),
      imageUrl: image,
      roomName: toText(room['name']),
      paymentStatus: toText(json['payment_status']),
      paymentType: toText(json['payment_type']),
      depositAmount: toNum(json['deposit_amount']),
      amountPaid: toNum(json['amount_paid']),
      confirmationCode: toText(json['confirmation_code']),
      bookingNumber: toText(json['booking_number']),
      accessToken: toText(json['access_token']),
      wasModified: toBool(json['was_modified']),
      expiresAt: json['expires_at'] is String ? DateTime.tryParse(json['expires_at'] as String)?.toLocal() : null,
      isNonRefundable: toBool(json['is_non_refundable']),
      cancellationHours: toInt(json['cancellation_policy_hours_snapshot']),
      specialRequests: toText(json['special_requests']),
      refundAmount: toNum(json['refund_amount']),
      creditAmount: toNum(json['credit_amount']),
      paymentOptions: json['payment_options'] is Map ? PaymentOptions.fromJson(json['payment_options']) : null,
    );
  }

  static BookingStatus _status(String? s) => switch (s) {
        'awaiting_host_confirmation' => BookingStatus.awaitingHost,
        'confirmed' => BookingStatus.confirmed,
        'cancelled' => BookingStatus.cancelled,
        'completed' => BookingStatus.completed,
        _ => BookingStatus.pending,
      };

  /// Les dates de séjour sont des jours entiers : « 2026-12-12 » ou « 2026-12-12T00:00:00.000000Z » donnent le même jour.
  static DateTime _date(Object? value) {
    final text = value is String ? value : '';
    final match = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(text);
    if (match == null) return DateTime.fromMillisecondsSinceEpoch(0);

    return DateTime(int.parse(match[1]!), int.parse(match[2]!), int.parse(match[3]!));
  }
}

enum BookingTab { upcoming, past, cancelled }

/// Résultat d'une annulation : l'avoir éventuellement crédité par le serveur.
class CancelResult {
  const CancelResult({this.creditAmount, this.message});

  final num? creditAmount;
  final String? message;
}
