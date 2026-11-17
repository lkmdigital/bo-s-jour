import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/providers.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/booking_request.dart';
import '../domain/price_quote.dart';

abstract class BookingRepository {
  /// Devis du séjour, calculé par le serveur (nuits, remises, garantie, paiement intégral).
  Future<PriceQuote> quote(QuoteParams params);

  /// Envoie la demande à l'hôte. Aucun paiement à ce stade.
  Future<CreatedBooking> create(BookingRequest request);
}

class ApiBookingRepository implements BookingRepository {
  ApiBookingRepository(this._dio, this._l10n);

  final Dio _dio;
  final AppLocalizations _l10n;

  @override
  Future<PriceQuote> quote(QuoteParams p) => guardApi(() async {
        final response = await _dio.get<Map<String, dynamic>>('/accommodations/${p.accommodationId}/price-preview', queryParameters: {
          'check_in': apiDate(p.checkIn),
          'check_out': apiDate(p.checkOut),
          if (p.roomId != null) 'room_id': p.roomId,
          if (p.rooms > 1) 'rooms_quantity': p.rooms,
          if (p.referralCode != null && p.referralCode!.trim().isNotEmpty) 'referral_code': p.referralCode!.trim().toUpperCase(),
        });

        return PriceQuote.fromJson(response.data ?? const {});
      }, _l10n);

  @override
  Future<CreatedBooking> create(BookingRequest request) => guardApi(() async {
        final response = await _dio.post<Map<String, dynamic>>('/bookings', data: request.toJson());

        return CreatedBooking.fromJson(response.data ?? const {});
      }, _l10n);
}

final bookingRepositoryProvider = Provider<BookingRepository>((ref) => ApiBookingRepository(ref.watch(dioProvider), ref.watch(l10nProvider)));

/// Un devis par jeu de paramètres : changer de dates puis revenir est instantané.
final priceQuoteProvider = FutureProvider.autoDispose.family<PriceQuote, QuoteParams>((ref, params) => ref.watch(bookingRepositoryProvider).quote(params));
