import 'dart:ui';

import 'package:bosejour/core/network/api_exception.dart';
import 'package:bosejour/core/network/providers.dart';
import 'package:bosejour/core/storage/token_storage.dart';
import 'package:bosejour/features/auth/data/auth_repository.dart';
import 'package:bosejour/features/auth/presentation/auth_controller.dart';
import 'package:bosejour/l10n/app_localizations.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

void main() {
  final l10n = lookupAppLocalizations(const Locale('fr'));
  const userJson = {'id': 7, 'name': 'Awa Koné', 'email': 'awa@example.com', 'role': 'user'};

  ApiAuthRepository repo(FakeAdapter adapter, MemoryTokenStorage storage) {
    final dio = Dio(BaseOptions(baseUrl: 'https://api.test/api'))..httpClientAdapter = adapter;

    return ApiAuthRepository(dio, storage, l10n);
  }

  group('ApiAuthRepository', () {
    test('une connexion réussie enregistre le jeton et renvoie l\'utilisateur', () async {
      final storage = MemoryTokenStorage();
      final adapter = FakeAdapter({'POST /login': ok({'user': userJson, 'token': 'tok-123'})});

      final result = await repo(adapter, storage).login(' awa@example.com ', 'secret');

      expect(result, isA<LoginSuccess>());
      expect((result as LoginSuccess).user.name, 'Awa Koné');
      expect(await storage.read(), 'tok-123');
      expect(adapter.requests.single.data, {'email': 'awa@example.com', 'password': 'secret'}, reason: 'l\'e-mail est nettoyé des espaces');
    });

    test('des identifiants refusés lèvent un message clair et ne stockent rien', () async {
      final storage = MemoryTokenStorage();
      final adapter = FakeAdapter({'POST /login': status(422, {'message': 'x', 'errors': {'email': ['Ces identifiants sont incorrects.']}})});

      await expectLater(repo(adapter, storage).login('a@b.co', 'mauvais'), throwsA(isA<ApiException>().having((e) => e.message, 'message', 'Ces identifiants sont incorrects.')));
      expect(await storage.read(), isNull);
    });

    test('une étape supplémentaire (code e-mail ou double authentification) est signalée sans connecter', () async {
      final storage = MemoryTokenStorage();

      final otp = await repo(FakeAdapter({'POST /login': ok({'requires_email_otp': true, 'user_id': 9})}), storage).login('a@b.co', 'x');
      final twoFa = await repo(FakeAdapter({'POST /login': ok({'requires_2fa': true, 'temp_token': 't'})}), storage).login('a@b.co', 'x');

      expect(otp, isA<LoginNeedsEmailOtp>());
      expect(twoFa, isA<LoginNeedsTwoFactor>());
      expect(await storage.read(), isNull, reason: 'le jeton temporaire de la double authentification n\'est jamais gardé');
    });

    test('rouvrir la session : jeton valide → utilisateur ; jeton refusé → jeton effacé', () async {
      final valid = MemoryTokenStorage('tok');
      expect((await repo(FakeAdapter({'GET /me': ok(userJson)}), valid).restore())?.id, 7);

      final expired = MemoryTokenStorage('vieux');
      expect(await repo(FakeAdapter({'GET /me': status(401, {'message': 'Non authentifié.'})}), expired).restore(), isNull);
      expect(await expired.read(), isNull);
    });

    test('rouvrir la session sans réseau : pas de session, mais le jeton est conservé', () async {
      final storage = MemoryTokenStorage('tok');

      expect(await repo(FakeAdapter({'GET /me': offline()}), storage).restore(), isNull);
      expect(await storage.read(), 'tok');
    });

    test('aucun jeton : aucune requête', () async {
      final adapter = FakeAdapter({});

      expect(await repo(adapter, MemoryTokenStorage()).restore(), isNull);
      expect(adapter.requests, isEmpty);
    });

    test('se déconnecter efface le jeton même hors ligne', () async {
      final storage = MemoryTokenStorage('tok');

      await repo(FakeAdapter({'POST /logout': offline()}), storage).logout();

      expect(await storage.read(), isNull);
    });
  });

  group('AuthController', () {
    ProviderContainer container(FakeAuthRepository auth, [MemoryTokenStorage? storage]) {
      final c = ProviderContainer(overrides: [authRepositoryProvider.overrideWithValue(auth), tokenStorageProvider.overrideWithValue(storage ?? MemoryTokenStorage())]);
      addTearDown(c.dispose);

      return c;
    }

    test('au démarrage, la session enregistrée est rouverte', () async {
      final c = container(FakeAuthRepository(restored: traveler));

      expect((await c.read(authControllerProvider.future))?.email, 'awa@example.com');
    });

    test('se connecter met à jour la session ; une étape supplémentaire ne connecte pas', () async {
      final auth = FakeAuthRepository();
      final c = container(auth);
      await c.read(authControllerProvider.future);

      auth.loginResult = const LoginNeedsEmailOtp(3);
      await c.read(authControllerProvider.notifier).login('a@b.co', 'x');
      expect(c.read(authControllerProvider).value, isNull);

      auth.loginResult = const LoginSuccess(traveler);
      await c.read(authControllerProvider.notifier).login('a@b.co', 'x');
      expect(c.read(authControllerProvider).value?.id, 1);
    });

    test('se déconnecter vide la session', () async {
      final auth = FakeAuthRepository(restored: traveler);
      final c = container(auth);
      await c.read(authControllerProvider.future);

      await c.read(authControllerProvider.notifier).logout();

      expect(c.read(authControllerProvider).value, isNull);
      expect(auth.logouts, 1);
    });

    test('un jeton refusé par le réseau ferme la session et efface le jeton', () async {
      final storage = MemoryTokenStorage('tok');
      final c = container(FakeAuthRepository(restored: traveler), storage);
      await c.read(authControllerProvider.future);

      c.read(sessionEventsProvider).notifyUnauthorized();
      await Future<void>.delayed(Duration.zero);
      await Future<void>.delayed(Duration.zero);

      expect(c.read(authControllerProvider).value, isNull);
      expect(await storage.read(), isNull);
    });
  });

  group('client réseau (dioProvider)', () {
    test('le jeton part dans l\'en-tête, avec la version de l\'appli', () async {
      final adapter = FakeAdapter({'GET /ping': ok({'ok': true})});
      final c = ProviderContainer(overrides: [tokenStorageProvider.overrideWithValue(MemoryTokenStorage('tok-9')), appVersionProvider.overrideWithValue('2.1.0+5')]);
      addTearDown(c.dispose);
      c.read(dioProvider).httpClientAdapter = adapter;

      await c.read(dioProvider).get<void>('/ping');

      final headers = adapter.requests.single.headers;
      expect(headers['Authorization'], 'Bearer tok-9');
      expect(headers['X-App-Version'], '2.1.0+5');
      expect(headers['X-App-Platform'], 'mobile');
      expect(headers['Accept'], 'application/json');
    });

    test('un 401 avec jeton déclenche l\'évènement de session ; sans jeton, non', () async {
      final adapter = FakeAdapter({'GET /private': status(401, {'message': 'Non authentifié.'})});

      Future<int> unauthorizedEvents(String? token) async {
        final c = ProviderContainer(overrides: [tokenStorageProvider.overrideWithValue(MemoryTokenStorage(token))]);
        addTearDown(c.dispose);
        c.read(dioProvider).httpClientAdapter = adapter;
        var count = 0;
        c.read(sessionEventsProvider).unauthorized.listen((_) => count++);
        await c.read(dioProvider).get<void>('/private').then((_) {}, onError: (_) {});
        await Future<void>.delayed(Duration.zero);

        return count;
      }

      expect(await unauthorizedEvents('tok'), 1);
      expect(await unauthorizedEvents(null), 0);
    });
  });
}
