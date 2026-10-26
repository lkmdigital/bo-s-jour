import 'dart:async';
import 'dart:ui' as ui;

import 'package:dio/dio.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../l10n/app_localizations.dart';
import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

/// Version de l'application (remplacée au démarrage par la vraie version, voir main.dart).
final appVersionProvider = Provider<String>((ref) => '0.0.0');

final tokenStorageProvider = Provider<TokenStorage>((ref) => SecureTokenStorage());

/// Langue de l'appli : celle du téléphone si elle est prise en charge (français, anglais), sinon le français.
final localeProvider = Provider<Locale>((ref) {
  final code = ui.PlatformDispatcher.instance.locale.languageCode;
  return Locale(code == 'en' ? 'en' : 'fr');
});

/// Textes traduits, utilisables en dehors des widgets (messages d'erreur du réseau).
final l10nProvider = Provider<AppLocalizations>((ref) => lookupAppLocalizations(ref.watch(localeProvider)));

/// Évènements de session : le réseau signale ici qu'un jeton a été refusé (expiré ou révoqué).
class SessionEvents {
  final _controller = StreamController<void>.broadcast();

  Stream<void> get unauthorized => _controller.stream;

  void notifyUnauthorized() {
    if (!_controller.isClosed) _controller.add(null);
  }

  void dispose() => _controller.close();
}

final sessionEventsProvider = Provider<SessionEvents>((ref) {
  final events = SessionEvents();
  ref.onDispose(events.dispose);
  return events;
});

final dioProvider = Provider<Dio>((ref) {
  final storage = ref.watch(tokenStorageProvider);
  final events = ref.watch(sessionEventsProvider);
  final version = ref.watch(appVersionProvider);
  final locale = ref.watch(localeProvider);

  final dio = Dio(BaseOptions(
    baseUrl: AppConfig.apiUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 25),
    headers: {
      'Accept': 'application/json',
      'Accept-Language': locale.languageCode,
      'X-App-Platform': 'mobile',
      'X-App-Version': version,
    },
  ));

  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await storage.read();
      if (token != null && token.isNotEmpty) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) {
      // Un jeton envoyé puis refusé : la session n'est plus valable (voir AuthController).
      if (error.response?.statusCode == 401 && error.requestOptions.headers.containsKey('Authorization')) {
        events.notifyUnauthorized();
      }
      handler.next(error);
    },
  ));

  return dio;
});

/// Exécute un appel réseau en traduisant les erreurs en [ApiException] lisible par le voyageur.
Future<T> guardApi<T>(Future<T> Function() call, AppLocalizations l10n) async {
  try {
    return await call();
  } on DioException catch (e) {
    throw ApiException.fromDio(e, l10n);
  }
}
