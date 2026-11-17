import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/providers.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/payment_models.dart';

abstract class PaymentRepository {
  Future<List<PaymentMethodInfo>> methods();

  /// Lance le paiement. Le serveur fixe le montant (intégral ou garantie) : l'appli n'envoie que le choix.
  Future<PaymentInitiation> initiate(int bookingId, {required String method, required PaymentPlan plan});

  /// Repli : récupère la page de la passerelle quand l'initiation ne l'a pas renvoyée.
  Future<String?> link(int paymentId, String method);

  /// État du paiement. Le serveur interroge lui-même la passerelle si sa notification n'est pas arrivée.
  Future<PaymentState> status(int paymentId);
}

class ApiPaymentRepository implements PaymentRepository {
  ApiPaymentRepository(this._dio, this._l10n);

  final Dio _dio;
  final AppLocalizations _l10n;

  @override
  Future<List<PaymentMethodInfo>> methods() => guardApi(() async {
        final response = await _dio.get<List<dynamic>>('/payment-methods');
        final data = response.data ?? const [];

        return data.whereType<Map<String, dynamic>>().where((m) => m['is_active'] != false).map(PaymentMethodInfo.fromJson).where((m) => m.slug.isNotEmpty).toList();
      }, _l10n);

  @override
  Future<PaymentInitiation> initiate(int bookingId, {required String method, required PaymentPlan plan}) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>('/bookings/$bookingId/payment/initiate', data: {'payment_method': method, 'payment_type': plan == PaymentPlan.full ? 'full' : 'guarantee'});
      final data = response.data ?? const <String, dynamic>{};
      final payment = data['payment'];
      final id = payment is Map ? (payment['id'] as num?)?.toInt() : null;
      if (id == null) throw DioException(requestOptions: response.requestOptions, response: response, type: DioExceptionType.badResponse);
      final link = (data['link'] ?? data['payment_url']) as String?;

      return PaymentInitiation(paymentId: id, link: link == null || link.isEmpty ? null : link, awaitingPhone: data['awaiting_phone_validation'] == true, requiresOtp: data['requires_otp'] == true);
    } on DioException catch (e) {
      // Ici le serveur répond souvent { error: "…" } (message déjà adressé au voyageur), pas { message }.
      final error = e.response?.data is Map ? (e.response!.data as Map)['error'] : null;
      if (error is String && error.trim().isNotEmpty && e.response?.statusCode != null && e.response!.statusCode! < 500) {
        throw ApiException(ApiErrorKind.rejected, error.trim(), statusCode: e.response!.statusCode);
      }
      if (error is String && error.trim().isNotEmpty) throw ApiException(ApiErrorKind.server, error.trim(), statusCode: e.response?.statusCode);
      throw ApiException.fromDio(e, _l10n);
    }
  }

  @override
  Future<String?> link(int paymentId, String method) => guardApi(() async {
        final response = await _dio.post<Map<String, dynamic>>('/payments/$paymentId/process', data: {'payment_method': method});
        final data = response.data ?? const <String, dynamic>{};
        final link = (data['link'] ?? data['payment_url'] ?? data['redirect_url']) as String?;

        return link == null || link.isEmpty ? null : link;
      }, _l10n);

  @override
  Future<PaymentState> status(int paymentId) => guardApi(() async {
        final response = await _dio.get<Map<String, dynamic>>('/payments/$paymentId');

        return paymentStateOf(response.data?['status'] as String?);
      }, _l10n);
}

final paymentRepositoryProvider = Provider<PaymentRepository>((ref) => ApiPaymentRepository(ref.watch(dioProvider), ref.watch(l10nProvider)));

final paymentMethodsProvider = FutureProvider.autoDispose<List<PaymentMethodInfo>>((ref) => ref.watch(paymentRepositoryProvider).methods());
