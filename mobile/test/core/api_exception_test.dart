import 'dart:ui';

import 'package:bosejour/core/network/api_exception.dart';
import 'package:bosejour/l10n/app_localizations.dart';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final l10n = lookupAppLocalizations(const Locale('fr'));
  final options = RequestOptions(path: '/x');

  DioException http(int code, [Object? body]) => DioException(requestOptions: options, type: DioExceptionType.badResponse, response: Response(requestOptions: options, statusCode: code, data: body));

  test('une erreur de validation reprend le premier message du serveur', () {
    final e = ApiException.fromDio(http(422, {'message': 'The given data was invalid.', 'errors': {'email': ['Ces identifiants sont incorrects.']}}), l10n);

    expect(e.kind, ApiErrorKind.rejected);
    expect(e.message, 'Ces identifiants sont incorrects.');
  });

  test('sans message du serveur, un texte de l\'appli est utilisé', () {
    expect(ApiException.fromDio(http(422, <String, dynamic>{}), l10n).message, l10n.errorGeneric);
    expect(ApiException.fromDio(http(404, 'page'), l10n).message, l10n.errorGeneric);
  });

  test('un jeton refusé est une erreur de session', () {
    final e = ApiException.fromDio(http(401, {'message': 'Non authentifié.'}), l10n);

    expect(e.kind, ApiErrorKind.unauthorized);
    expect(e.statusCode, 401);
  });

  test('trop de tentatives : le message du serveur (avec le délai) est conservé', () {
    final e = ApiException.fromDio(http(429, {'message': 'Trop de tentatives. Merci de réessayer dans 42 seconde(s).'}), l10n);

    expect(e.kind, ApiErrorKind.tooManyRequests);
    expect(e.message, contains('42'));
  });

  test('une panne serveur ne montre jamais le détail technique', () {
    final e = ApiException.fromDio(http(500, {'message': 'SQLSTATE[HY000] Server Error with secrets'}), l10n);

    expect(e.kind, ApiErrorKind.server);
    expect(e.message, l10n.errorServer);
    expect(e.message, isNot(contains('SQLSTATE')));
  });

  test('pas de réseau, délai dépassé ou aucune réponse : message réseau', () {
    for (final type in [DioExceptionType.connectionError, DioExceptionType.connectionTimeout, DioExceptionType.receiveTimeout]) {
      final e = ApiException.fromDio(DioException(requestOptions: options, type: type), l10n);
      expect(e.kind, ApiErrorKind.network);
      expect(e.message, l10n.errorNetwork);
    }
    expect(ApiException.fromDio(DioException(requestOptions: options, type: DioExceptionType.unknown), l10n).kind, ApiErrorKind.network);
  });

  test('les messages existent en anglais', () {
    final en = lookupAppLocalizations(const Locale('en'));

    expect(ApiException.fromDio(DioException(requestOptions: options, type: DioExceptionType.connectionError), en).message, contains('internet'));
  });
}
