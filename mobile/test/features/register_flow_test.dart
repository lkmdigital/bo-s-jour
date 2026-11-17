import 'package:bosejour/core/network/api_exception.dart';
import 'package:bosejour/core/storage/token_storage.dart';
import 'package:bosejour/features/auth/data/auth_repository.dart';
import 'package:bosejour/l10n/app_localizations.dart';
import 'package:bosejour/shared/widgets/bo_orb.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

void main() {
  final l10n = lookupAppLocalizations(const Locale('fr'));

  group('ApiAuthRepository : inscription et vérification', () {
    ApiAuthRepository repo(FakeAdapter adapter, MemoryTokenStorage storage) =>
        ApiAuthRepository(Dio(BaseOptions(baseUrl: 'https://api.test/api'))..httpClientAdapter = adapter, storage, l10n);

    const request = RegisterRequest(firstName: ' Awa ', lastName: 'Koné', email: ' awa@example.com ', phone: '+2250707000000', password: 'motdepasse12', referralCode: 'aminata5');

    test('créer le compte envoie les champs attendus par le serveur et ne connecte pas', () async {
      final storage = MemoryTokenStorage();
      final adapter = FakeAdapter({'POST /auth/register-traveler': status(201, {'requires_email_otp': true, 'user_id': 12, 'email': 'awa@example.com'})});

      final pending = await repo(adapter, storage).register(request);

      expect(pending.userId, 12);
      expect(pending.email, 'awa@example.com');
      expect(await storage.read(), isNull, reason: 'aucune session avant la vérification de l\'e-mail');
      expect(adapter.requests.single.data, {
        'first_name': 'Awa',
        'last_name': 'Koné',
        'email': 'awa@example.com',
        'phone': '+2250707000000',
        'whatsapp': '+2250707000000',
        'password': 'motdepasse12',
        'password_confirmation': 'motdepasse12',
        'traveler_type': 'individual',
        'accept_terms': true,
        'referral_code': 'AMINATA5',
      });
    });

    test('un compte entreprise envoie la raison sociale', () async {
      final adapter = FakeAdapter({'POST /auth/register-traveler': status(201, {'requires_email_otp': true, 'user_id': 1})});

      await repo(adapter, MemoryTokenStorage()).register(const RegisterRequest(firstName: 'A', lastName: 'B', email: 'a@b.co', phone: '+2250101010101', password: '12345678', corporate: true, companyName: ' HCS Consulting '));

      final body = adapter.requests.single.data as Map;
      expect(body['traveler_type'], 'corporate');
      expect(body['company_name'], 'HCS Consulting');
      expect(body.containsKey('referral_code'), isFalse);
    });

    test('un e-mail déjà pris remonte le message du serveur', () async {
      final adapter = FakeAdapter({'POST /auth/register-traveler': status(422, {'message': 'x', 'errors': {'email': ['Un compte existe déjà avec cet e-mail.']}})});

      await expectLater(repo(adapter, MemoryTokenStorage()).register(request), throwsA(isA<ApiException>().having((e) => e.message, 'message', 'Un compte existe déjà avec cet e-mail.')));
    });

    test('le bon code ouvre la session et enregistre le jeton', () async {
      final storage = MemoryTokenStorage();
      final adapter = FakeAdapter({'POST /auth/verify-otp': ok({'user': {'id': 12, 'name': 'Awa Koné', 'email': 'awa@example.com', 'role': 'user'}, 'token': 'tok-otp'})});

      final user = await repo(adapter, storage).verifyOtp(12, ' 123456 ');

      expect(user.id, 12);
      expect(await storage.read(), 'tok-otp');
      expect(adapter.requests.single.data, {'user_id': 12, 'code': '123456'});
    });

    test('un mauvais code lève le message du serveur et ne stocke rien', () async {
      final storage = MemoryTokenStorage();
      final adapter = FakeAdapter({'POST /auth/verify-otp': status(422, {'message': 'x', 'errors': {'code': ['Code incorrect. Vérifiez votre email et réessayez.']}})});

      await expectLater(repo(adapter, storage).verifyOtp(12, '000000'), throwsA(isA<ApiException>().having((e) => e.message, 'message', startsWith('Code incorrect'))));
      expect(await storage.read(), isNull);
    });

    test('la double authentification : le jeton temporaire sert uniquement à valider, puis le vrai jeton est gardé', () async {
      final storage = MemoryTokenStorage();
      final adapter = FakeAdapter({'POST /login/complete-2fa': ok({'user': {'id': 3, 'name': 'Awa', 'email': 'a@b.co', 'role': 'user'}, 'token': 'tok-final'})});

      await repo(adapter, storage).completeTwoFactor('temp-9', code: '654321');

      expect(adapter.requests.single.headers['Authorization'], 'Bearer temp-9');
      expect(adapter.requests.single.data, {'code': '654321'});
      expect(await storage.read(), 'tok-final');
    });

    test('un code de secours est envoyé en majuscules', () async {
      final adapter = FakeAdapter({'POST /login/complete-2fa': ok({'user': {'id': 3, 'name': 'Awa', 'email': 'a@b.co', 'role': 'user'}, 'token': 't'})});

      await repo(adapter, MemoryTokenStorage()).completeTwoFactor('temp', recoveryCode: 'abcd1234');

      expect(adapter.requests.single.data, {'recovery_code': 'ABCD1234'});
    });

    test('mot de passe oublié, renvoi du code et reconnaissance d\'une invitation', () async {
      final adapter = FakeAdapter({
        'POST /auth/forgot-password': ok({'message': 'ok'}),
        'POST /auth/send-otp': ok({'message': 'ok'}),
        'GET /referral/resolve/AMINATA5': ok({'valid': true, 'type': 'partner', 'label': 'Aminata K.', 'discount_percent': 5}),
      });
      final r = repo(adapter, MemoryTokenStorage());

      await r.forgotPassword(' awa@example.com ');
      await r.resendOtp('awa@example.com');
      final info = await r.resolveReferral('AMINATA5');

      expect(adapter.requests[0].data, {'email': 'awa@example.com'});
      expect(info.valid, isTrue);
      expect(info.label, 'Aminata K.');
      expect(info.discountPercent, 5);
    });
  });

  group('Créer mon espace', () {
    Future<void> open(WidgetTester tester, FakeAuthRepository auth) async {
      await pumpApp(tester, auth: auth);
      await tester.tap(find.text('Compte'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('login-create')));
      await tester.pumpAndSettle();
    }

    Future<void> fill(WidgetTester tester, {bool accept = true}) async {
      await tester.enterText(find.byKey(const Key('register-first')), 'Awa');
      await tester.enterText(find.byKey(const Key('register-last')), 'Koné');
      await tester.enterText(find.byKey(const Key('register-email')), 'awa@example.com');
      await tester.enterText(find.byKey(const Key('register-phone')), '07 07 00 00 00');
      await tester.enterText(find.byKey(const Key('register-password')), 'motdepasse12');
      if (accept) {
        await tester.ensureVisible(find.byKey(const Key('register-terms')));
        await tester.tap(find.byKey(const Key('register-terms')));
      }
      await tester.pumpAndSettle();
    }

    Future<void> submit(WidgetTester tester) async {
      await tester.ensureVisible(find.byKey(const Key('register-submit')));
      await tester.tap(find.byKey(const Key('register-submit')));
      await tester.pumpAndSettle();
    }

    testWidgets('le lien « Créer mon espace » ouvre le formulaire dans l\'appli (plus de renvoi vers le site)', (tester) async {
      await open(tester, FakeAuthRepository());

      expect(find.text('Créer mon espace'), findsWidgets);
      expect(find.text('Individuel'), findsOneWidget);
      expect(find.text('Entreprise'), findsOneWidget);
      expect(find.byKey(const Key('register-company')), findsNothing);
    });

    testWidgets('un formulaire incomplet est refusé champ par champ, sans appel au serveur', (tester) async {
      final auth = FakeAuthRepository();
      await open(tester, auth);

      await submit(tester);

      expect(find.text('Champ obligatoire.'), findsNWidgets(2));
      expect(find.text('Saisissez votre e-mail.'), findsOneWidget);
      expect(find.text('Acceptez les conditions pour continuer.'), findsOneWidget);
      expect(auth.registrations, isEmpty);
    });

    testWidgets('parcours complet : formulaire → code → bienvenue → accueil', (tester) async {
      final auth = FakeAuthRepository();
      await open(tester, auth);
      await fill(tester);
      await submit(tester);

      expect(auth.registrations.single.phone, '+2250707000000', reason: 'l\'indicatif +225 est ajouté au numéro saisi');
      expect(auth.registrations.single.corporate, isFalse);
      expect(find.text('Entrez le code reçu'), findsOneWidget);
      expect(find.byKey(const Key('otp-countdown')), findsOneWidget);

      await tester.enterText(find.byKey(const Key('otp-field')), '482913');
      await tester.pumpAndSettle();

      expect(auth.otpAttempts, [(42, '482913')]);
      expect(find.textContaining('Bienvenue'), findsOneWidget);
      expect(find.byKey(const Key('welcome-discount')), findsNothing, reason: 'pas d\'invitation, pas de bandeau de réduction');

      await tester.tap(find.byKey(const Key('welcome-cta')));
      await tester.pumpAndSettle();

      expect(find.text('Où allez-vous ?'), findsOneWidget);
    });

    testWidgets('compte entreprise : la société est demandée et envoyée', (tester) async {
      final auth = FakeAuthRepository();
      await open(tester, auth);
      await tester.tap(find.byKey(const Key('kind-corporate')));
      await tester.pumpAndSettle();
      await fill(tester);
      await submit(tester);

      expect(find.text('Saisissez le nom de la société.'), findsOneWidget);

      await tester.enterText(find.byKey(const Key('register-company')), 'HCS Consulting');
      await submit(tester);

      expect(auth.registrations.single.corporate, isTrue);
      expect(auth.registrations.single.companyName, 'HCS Consulting');
    });

    testWidgets('un code d\'invitation reconnu est annoncé, puis rappelé à la bienvenue', (tester) async {
      final auth = FakeAuthRepository(referral: const ReferralInfo(valid: true, label: 'Aminata K.', discountPercent: 5));
      await open(tester, auth);
      await fill(tester);
      await tester.enterText(find.byKey(const Key('register-code')), 'aminata5');
      await tester.pumpAndSettle();

      await submit(tester); // le code est reconnu au plus tard à l'envoi du formulaire

      expect(auth.referralLookups, ['AMINATA5']);
      expect(auth.registrations.single.referralCode, 'AMINATA5');

      await tester.enterText(find.byKey(const Key('otp-field')), '111111');
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('welcome-discount')), findsOneWidget);
      expect(find.text('−5 % sur votre première réservation'), findsOneWidget);
    });

    testWidgets('un e-mail déjà utilisé affiche le message du serveur et reste sur le formulaire', (tester) async {
      final auth = FakeAuthRepository(registerError: ApiException(ApiErrorKind.rejected, 'Un compte existe déjà avec cet e-mail.', statusCode: 422));
      await open(tester, auth);
      await fill(tester);
      await submit(tester);

      expect(find.text('Un compte existe déjà avec cet e-mail.'), findsOneWidget);
      expect(find.text('Entrez le code reçu'), findsNothing);
    });

    testWidgets('un mauvais code est signalé, le champ est vidé et on peut recommencer', (tester) async {
      final auth = FakeAuthRepository(otpError: ApiException(ApiErrorKind.rejected, 'Code incorrect. Vérifiez votre email et réessayez.', statusCode: 422));
      await open(tester, auth);
      await fill(tester);
      await submit(tester);

      await tester.enterText(find.byKey(const Key('otp-field')), '000000');
      await tester.pumpAndSettle();

      expect(find.textContaining('Code incorrect'), findsOneWidget);
      expect(find.text('Entrez le code reçu'), findsOneWidget);

      auth.otpError = null;
      await tester.enterText(find.byKey(const Key('otp-field')), '123456');
      await tester.pumpAndSettle();

      expect(auth.otpAttempts.length, 2);
      expect(find.textContaining('Bienvenue'), findsOneWidget);
    });

    testWidgets('le renvoi du code n\'est proposé qu\'après le compte à rebours', (tester) async {
      final auth = FakeAuthRepository();
      await open(tester, auth);
      await fill(tester);
      await submit(tester);

      expect(find.byKey(const Key('otp-resend')), findsNothing);

      await tester.pump(const Duration(seconds: 61));
      expect(find.byKey(const Key('otp-resend')), findsOneWidget);

      await tester.tap(find.byKey(const Key('otp-resend')));
      await tester.pump();

      expect(auth.resends, ['awa@example.com']);
      expect(find.text('Un nouveau code vient d\'être envoyé.'), findsOneWidget);
      expect(find.byKey(const Key('otp-countdown')), findsOneWidget);
    });
  });

  group('Double authentification et mot de passe oublié', () {
    Future<FakeAuthRepository> openTwoFactor(WidgetTester tester) async {
      final auth = FakeAuthRepository(loginResult: const LoginNeedsTwoFactor('temp-1'));
      await pumpApp(tester, auth: auth);
      await tester.tap(find.text('Compte'));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('login-email')), 'awa@example.com');
      await tester.enterText(find.byKey(const Key('login-password')), 'secret');
      await tester.tap(find.widgetWithText(FilledButton, 'Accéder à mon espace'));
      await tester.pumpAndSettle();

      return auth;
    }

    testWidgets('le code de l\'application ouvre la session', (tester) async {
      final auth = await openTwoFactor(tester);

      expect(find.text('Double authentification'), findsOneWidget);
      await tester.enterText(find.byKey(const Key('otp-field')), '654321');
      await tester.pumpAndSettle();

      expect(auth.twoFactorAttempts, [('temp-1', '654321', null)]);
      expect(find.text('Double authentification'), findsNothing);
    });

    testWidgets('on peut basculer sur un code de secours', (tester) async {
      final auth = await openTwoFactor(tester);

      await tester.tap(find.byKey(const Key('twofa-toggle')));
      await tester.pumpAndSettle();
      await tester.enterText(find.byKey(const Key('twofa-recovery')), 'abcd1234');
      await tester.tap(find.widgetWithText(FilledButton, 'Valider'));
      await tester.pumpAndSettle();

      expect(auth.twoFactorAttempts, [('temp-1', null, 'abcd1234')]);
    });

    testWidgets('mot de passe oublié : le lien est demandé dans l\'appli et la confirmation s\'affiche', (tester) async {
      final auth = FakeAuthRepository();
      await pumpApp(tester, auth: auth);
      await tester.tap(find.text('Compte'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('login-forgot')));
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('forgot-email')), 'awa@example.com');
      await tester.tap(find.widgetWithText(FilledButton, 'Envoyer le lien'));
      await tester.pumpAndSettle();

      expect(auth.forgotten, ['awa@example.com']);
      expect(find.byKey(const Key('forgot-sent')), findsOneWidget);
    });
  });

  group('Bo, l\'orbe', () {
    for (final state in BoState.values) {
      testWidgets('s\'affiche à toutes les tailles en état ${state.name}', (tester) async {
        await tester.pumpWidget(MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(disableAnimations: true),
            child: Center(child: Column(mainAxisSize: MainAxisSize.min, children: [BoOrb(size: 24, state: state), BoOrb(size: 132, state: state, shadow: true)])),
          ),
        ));
        await tester.pumpAndSettle();

        expect(find.byType(BoOrb), findsNWidgets(2));
        expect(tester.takeException(), isNull);
      });
    }
  });
}
