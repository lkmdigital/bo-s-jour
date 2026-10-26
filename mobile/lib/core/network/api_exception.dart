import 'package:dio/dio.dart';

import '../../l10n/app_localizations.dart';

/// Erreur d'appel à l'API, avec un message prêt à être montré au voyageur (en français ou en anglais).
class ApiException implements Exception {
  ApiException(this.kind, this.message, {this.statusCode});

  final ApiErrorKind kind;
  final String message;
  final int? statusCode;

  /// Traduit une erreur Dio. Le message du serveur est repris tel quel quand il parle au voyageur
  /// (validation, identifiants refusés) ; sinon on affiche un texte générique de l'application.
  factory ApiException.fromDio(DioException e, AppLocalizations l10n) {
    final status = e.response?.statusCode;
    final data = e.response?.data;
    final serverMessage = _serverMessage(data);

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.connectionError:
        return ApiException(ApiErrorKind.network, l10n.errorNetwork);
      default:
        break;
    }

    if (status == null) {
      return ApiException(ApiErrorKind.network, l10n.errorNetwork);
    }
    if (status == 401) {
      return ApiException(ApiErrorKind.unauthorized, serverMessage ?? l10n.errorSession, statusCode: status);
    }
    if (status == 422 || status == 400 || status == 403 || status == 404) {
      return ApiException(ApiErrorKind.rejected, serverMessage ?? l10n.errorGeneric, statusCode: status);
    }
    if (status == 429) {
      return ApiException(ApiErrorKind.tooManyRequests, serverMessage ?? l10n.errorTooMany, statusCode: status);
    }
    if (status >= 500) {
      return ApiException(ApiErrorKind.server, l10n.errorServer, statusCode: status);
    }

    return ApiException(ApiErrorKind.unknown, serverMessage ?? l10n.errorGeneric, statusCode: status);
  }

  /// Premier message de validation (« errors.email[0] ») ou, à défaut, « message ».
  static String? _serverMessage(Object? data) {
    if (data is! Map) return null;
    final errors = data['errors'];
    if (errors is Map) {
      for (final value in errors.values) {
        if (value is List && value.isNotEmpty && value.first is String) return value.first as String;
        if (value is String) return value;
      }
    }
    final message = data['message'];
    return message is String && message.trim().isNotEmpty ? message : null;
  }

  @override
  String toString() => 'ApiException($kind, $statusCode): $message';
}

enum ApiErrorKind { network, unauthorized, rejected, tooManyRequests, server, unknown }
