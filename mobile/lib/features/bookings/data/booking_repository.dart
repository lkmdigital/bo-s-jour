import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/json.dart';
import '../../../core/network/providers.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/booking.dart';
import '../domain/booking_request.dart';
import '../domain/price_quote.dart';

abstract class BookingRepository {
  /// Devis du séjour, calculé par le serveur (nuits, remises, garantie, paiement intégral).
  Future<PriceQuote> quote(QuoteParams params);

  /// Envoie la demande à l'hôte. Aucun paiement à ce stade.
  Future<CreatedBooking> create(BookingRequest request);

  /// Les réservations du voyageur connecté, de la plus récente à la plus ancienne.
  Future<List<Booking>> mine();

  Future<Booking> detail(int id);

  /// Annule (le serveur applique la politique de l'établissement et crédite un avoir si elle le prévoit).
  Future<CancelResult> cancel(int id, String reason);
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

  @override
  Future<List<Booking>> mine() => guardApi(() async {
        final response = await _dio.get<Map<String, dynamic>>('/bookings', queryParameters: {'per_page': 100});
        final data = response.data?['data'];

        return data is List ? data.whereType<Map<String, dynamic>>().map(Booking.fromJson).toList() : const <Booking>[];
      }, _l10n);

  @override
  Future<Booking> detail(int id) => guardApi(() async {
        final response = await _dio.get<Map<String, dynamic>>('/bookings/$id');

        return Booking.fromJson(response.data ?? const {});
      }, _l10n);

  @override
  Future<CancelResult> cancel(int id, String reason) => guardApi(() async {
        final response = await _dio.post<Map<String, dynamic>>('/bookings/$id/cancel', data: {if (reason.trim().isNotEmpty) 'reason': reason.trim()});
        final credit = response.data?['credit_created'];

        return credit is Map<String, dynamic> ? CancelResult(creditAmount: toNum(credit['amount']), message: toText(credit['message'])) : const CancelResult();
      }, _l10n);
}

final bookingRepositoryProvider = Provider<BookingRepository>((ref) => ApiBookingRepository(ref.watch(dioProvider), ref.watch(l10nProvider)));

/// Un devis par jeu de paramètres : changer de dates puis revenir est instantané.
final priceQuoteProvider = FutureProvider.autoDispose.family<PriceQuote, QuoteParams>((ref, params) => ref.watch(bookingRepositoryProvider).quote(params));

/// Les réservations du voyageur ; à invalider après une demande ou une annulation.
final myBookingsProvider = FutureProvider.autoDispose<List<Booking>>((ref) => ref.watch(bookingRepositoryProvider).mine());

final bookingDetailProvider = FutureProvider.autoDispose.family<Booking, int>((ref, id) => ref.watch(bookingRepositoryProvider).detail(id));
