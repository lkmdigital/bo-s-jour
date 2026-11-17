/// Date au format attendu par l'API (« 2026-12-12 »), sans heure ni fuseau.
String apiDate(DateTime d) => '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Demande de réservation envoyée à l'hôte (POST /bookings). Le prix n'est jamais envoyé : le serveur le recalcule.
class BookingRequest {
  const BookingRequest({
    required this.accommodationId,
    required this.checkIn,
    required this.checkOut,
    required this.guests,
    required this.phone,
    required this.residenceCountry,
    this.roomId,
    this.children = 0,
    this.rooms = 1,
    this.arrivalTime,
    this.specialRequests,
    this.referralCode,
    this.promoCode,
    this.forThirdParty = false,
    this.travelerName,
    this.travelerPhone,
  });

  final int accommodationId;
  final int? roomId;
  final DateTime checkIn;
  final DateTime checkOut;

  /// Nombre total de voyageurs, enfants compris (comme l'API).
  final int guests;
  final int children;
  final int rooms;
  final String phone;
  final String residenceCountry;
  final String? arrivalTime; // « 21:00 »
  final String? specialRequests;
  final String? referralCode;
  final String? promoCode;
  final bool forThirdParty;
  final String? travelerName;
  final String? travelerPhone;

  Map<String, Object?> toJson() => {
        'accommodation_id': accommodationId,
        if (roomId != null) 'room_id': roomId,
        'check_in': apiDate(checkIn),
        'check_out': apiDate(checkOut),
        'guests': guests,
        if (children > 0) 'children': children,
        if (rooms > 1) 'rooms_quantity': rooms,
        'traveler_type': 'individual',
        'residence_country': residenceCountry,
        'phone': phone.trim(),
        if (arrivalTime != null && arrivalTime!.isNotEmpty) 'estimated_arrival_time': arrivalTime,
        if (specialRequests != null && specialRequests!.trim().isNotEmpty) 'special_requests': specialRequests!.trim(),
        if (referralCode != null && referralCode!.trim().isNotEmpty) 'referral_code': referralCode!.trim().toUpperCase(),
        if (promoCode != null && promoCode!.trim().isNotEmpty) 'promo_code': promoCode!.trim(),
        'booked_for_third_party': forThirdParty,
        if (forThirdParty) 'traveler_name': travelerName?.trim(),
        if (forThirdParty) 'traveler_phone': travelerPhone?.trim(),
      };
}

/// Réservation créée : l'hôte a 24 h pour répondre.
class CreatedBooking {
  const CreatedBooking({required this.id, required this.status, this.accessToken, this.accommodationName});

  final int id;
  final String status;

  /// Jeton des liens de la réservation (paiement…), remis une seule fois au créateur.
  final String? accessToken;
  final String? accommodationName;

  factory CreatedBooking.fromJson(Map<String, dynamic> json) {
    final accommodation = json['accommodation'];

    return CreatedBooking(
      id: (json['id'] as num).toInt(),
      status: json['status'] as String? ?? 'pending',
      accessToken: json['access_token'] as String?,
      accommodationName: accommodation is Map ? accommodation['name'] as String? : null,
    );
  }
}
