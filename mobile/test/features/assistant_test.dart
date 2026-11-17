import 'package:bosejour/core/network/api_exception.dart';
import 'package:bosejour/core/network/providers.dart';
import 'package:bosejour/features/assistant/data/assistant_repository.dart';
import 'package:bosejour/features/assistant/domain/bo_models.dart';
import 'package:bosejour/features/assistant/presentation/assistant_controller.dart';
import 'package:bosejour/features/auth/domain/user.dart';
import 'package:bosejour/l10n/app_localizations.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

const _offer = {'id': 16, 'name': 'Hôtel yatchenin vallon', 'type': 'hotel', 'city': 'Abidjan', 'rating': 4.5, 'photo': null, 'price_per_night_fcfa': 57000, 'total_fcfa': 114000, 'nights': 2, 'room': 'Standard', 'listing_link': '/accommodations/16', 'booking_link': '/bookings/new?accommodation=16'};

BoAnswer answerWith(String text, [List<Map<String, dynamic>> offers = const []]) => BoAnswer.fromJson({'data': {'answer': text, 'offers': offers}});

void main() {
  final l10n = lookupAppLocalizations(const Locale('fr'));

  group('ApiAssistantRepository', () {
    ApiAssistantRepository repo(FakeAdapter adapter) => ApiAssistantRepository(Dio(BaseOptions(baseUrl: 'https://api.test/api'))..httpClientAdapter = adapter, l10n);

    test('la réponse de Bo donne un texte et des cartes d\'hébergements', () async {
      final adapter = FakeAdapter({'POST /assistant/ask': ok({'data': {'answer': 'Voici deux hôtels.', 'offers': [_offer]}})});

      final answer = await repo(adapter).ask('Un hôtel à Abidjan', [(role: 'user', content: 'Bonjour'), (role: 'assistant', content: 'Salut')]);

      expect(answer.text, 'Voici deux hôtels.');
      expect(answer.offers.single.name, 'Hôtel yatchenin vallon');
      expect(answer.offers.single.pricePerNight, 57000);
      expect(adapter.requests.single.data, {
        'question': 'Un hôtel à Abidjan',
        'history': [{'role': 'user', 'content': 'Bonjour'}, {'role': 'assistant', 'content': 'Salut'}],
      });
    });

    test('les réglages publics disent si Bo est actif et ouvert aux visiteurs ; une panne le laisse éteint', () async {
      final on = await repo(FakeAdapter({'GET /settings/public': ok({'ai_enabled': true, 'ai_guest_enabled': false})})).settings();
      final down = await repo(FakeAdapter({'GET /settings/public': offline()})).settings();

      expect(on.enabled, isTrue);
      expect(on.guestsAllowed, isFalse);
      expect(down.enabled, isFalse);
    });
  });

  group('BoChatController', () {
    ProviderContainer container(FakeAssistantRepository assistant) {
      final c = ProviderContainer(overrides: [assistantRepositoryProvider.overrideWithValue(assistant), localeProvider.overrideWithValue(const Locale('fr'))]);
      addTearDown(c.dispose);

      return c;
    }

    test('une question ajoute le message, puis la réponse avec ses cartes ; la première carte est choisie', () async {
      final bo = FakeAssistantRepository(answers: [answerWith('Voici.', [_offer])]);
      final c = container(bo);

      await c.read(boChatProvider.notifier).ask('  Un hôtel à Abidjan ');

      final state = c.read(boChatProvider);
      expect(state.messages.map((m) => m.role), [BoRole.user, BoRole.assistant]);
      expect(state.messages.first.text, 'Un hôtel à Abidjan');
      expect(state.activeOffers.single.id, 16);
      expect(state.selectedId, 16);
      expect(state.loading, isFalse);
    });

    test('une question trop courte est ignorée', () async {
      final bo = FakeAssistantRepository(answers: [answerWith('x')]);
      final c = container(bo);

      await c.read(boChatProvider.notifier).ask('ab');

      expect(bo.asked, isEmpty);
      expect(c.read(boChatProvider).messages, isEmpty);
    });

    test('seuls les 10 derniers échanges non locaux repartent au serveur', () async {
      final bo = FakeAssistantRepository(answers: [answerWith('ok')]);
      final c = container(bo);
      for (var i = 0; i < 7; i++) {
        await c.read(boChatProvider.notifier).ask('Question numéro $i');
      }

      expect(bo.asked.last.$2.length, 10);
      expect(bo.asked.last.$2.first.content, startsWith('Question numéro 1'), reason: '12 messages déjà échangés au 7e appel, dont les 10 derniers repartent');
    });

    test('un visiteur refusé (connexion demandée) reçoit un message local avec le bouton de connexion', () async {
      final bo = FakeAssistantRepository(error: ApiException(ApiErrorKind.unauthorized, 'Connectez-vous à votre espace voyageur pour discuter avec l\'assistant.', statusCode: 401));
      final c = container(bo);

      await c.read(boChatProvider.notifier).ask('Un hôtel à Abidjan');

      final last = c.read(boChatProvider).last!;
      expect(last.local, isTrue);
      expect(last.loginRequired, isTrue);
    });

    test('trop de questions : message clair ; panne : message générique, jamais de détail technique', () async {
      final tooMany = FakeAssistantRepository(error: ApiException(ApiErrorKind.tooManyRequests, l10n.errorTooMany, statusCode: 429));
      final c1 = container(tooMany);
      await c1.read(boChatProvider.notifier).ask('Un hôtel à Abidjan');
      expect(c1.read(boChatProvider).last!.text, l10n.boErrorTooFast);

      final broken = FakeAssistantRepository(error: ApiException(ApiErrorKind.server, l10n.errorServer, statusCode: 502));
      final c2 = container(broken);
      await c2.read(boChatProvider.notifier).ask('Un hôtel à Abidjan');
      expect(c2.read(boChatProvider).last!.text, l10n.boErrorGeneric);
      expect(c2.read(boChatProvider).last!.local, isTrue);
    });

    test('les messages d\'erreur ne repartent pas comme historique ; recommencer vide la conversation', () async {
      final bo = FakeAssistantRepository(answers: [answerWith('ok')], error: ApiException(ApiErrorKind.server, 'x', statusCode: 502));
      final c = container(bo);
      await c.read(boChatProvider.notifier).ask('Première question');
      bo.error = null;
      await c.read(boChatProvider.notifier).ask('Deuxième question');

      expect(bo.asked.last.$2.map((h) => h.content), ['Première question'], reason: 'la réponse d\'erreur locale est écartée de l\'historique');

      c.read(boChatProvider.notifier).restart();
      expect(c.read(boChatProvider).messages, isEmpty);
    });
  });

  group('Écran de Bo', () {
    const enabled = AiSettings(enabled: true, guestsAllowed: true);

    Future<FakeAssistantRepository> open(WidgetTester tester, {AiSettings settings = enabled, List<BoAnswer>? answers, FakeAuthRepository? auth}) async {
      final bo = FakeAssistantRepository(settingsValue: settings, delay: const Duration(milliseconds: 300), answers: answers ?? [answerWith('Voici deux hôtels disponibles.', [_offer])]);
      await pumpApp(tester, assistant: bo, auth: auth);
      await tester.pump(const Duration(milliseconds: 300));
      await tester.tap(find.byKey(const Key('bo-launcher')));
      await tester.pump(const Duration(milliseconds: 500));

      return bo;
    }

    testWidgets('le bouton Bo n\'apparaît que si l\'administrateur a activé le module', (tester) async {
      await pumpApp(tester, assistant: FakeAssistantRepository(settingsValue: const AiSettings()));
      await tester.pumpAndSettle();
      expect(find.byKey(const Key('bo-launcher')), findsNothing);
    });

    testWidgets('le bouton Bo est absent pour un hôte (il a son propre assistant)', (tester) async {
      await pumpApp(tester, assistant: FakeAssistantRepository(settingsValue: enabled), auth: FakeAuthRepository(restored: const User(id: 2, name: 'Hôte', email: 'h@e.co', role: 'host')));
      await tester.pump(const Duration(milliseconds: 300));
      expect(find.byKey(const Key('bo-launcher')), findsNothing);
    });

    testWidgets('l\'accueil de Bo : salutation, présentation et quatre pastilles', (tester) async {
      await open(tester);

      expect(find.text('Bonjour !'), findsOneWidget);
      expect(find.text('Je suis Bo, votre assistant de séjour'), findsOneWidget);
      for (final tile in ['Un hôtel à Abidjan', 'Un week-end à Assinie', 'Une résidence meublée', 'Suivre ma réservation']) {
        expect(find.text(tile), findsOneWidget);
      }
    });

    testWidgets('toucher une pastille pose la question, Bo répond avec une carte « Choix de Bo »', (tester) async {
      final bo = await open(tester);

      await tester.tap(find.text('Un hôtel à Abidjan'));
      await tester.pump();
      expect(find.byKey(const Key('bo-typing')), findsOneWidget, reason: 'les trois points s\'affichent pendant la réflexion');
      await tester.pump(const Duration(milliseconds: 400));

      expect(bo.asked.single.$1, 'Je cherche un hôtel à Abidjan');
      expect(find.text('Voici deux hôtels disponibles.'), findsOneWidget);
      expect(find.text('Choix de Bo'), findsOneWidget);
      expect(find.text('Hôtel yatchenin vallon'), findsOneWidget);
      expect(find.textContaining('57'), findsWidgets);
    });

    testWidgets('on peut écrire sa question et l\'envoyer', (tester) async {
      final bo = await open(tester);

      await tester.enterText(find.byKey(const Key('bo-input')), 'Un week-end à Grand-Bassam avec piscine');
      await tester.tap(find.byKey(const Key('bo-send')));
      await tester.pump(const Duration(milliseconds: 400));

      expect(bo.asked.single.$1, 'Un week-end à Grand-Bassam avec piscine');
      expect(find.text('Un week-end à Grand-Bassam avec piscine'), findsOneWidget);
    });

    testWidgets('le bouton Voir ouvre la fiche de l\'établissement proposé', (tester) async {
      final bo = await open(tester);
      await tester.tap(find.text('Un hôtel à Abidjan'));
      await tester.pump(const Duration(milliseconds: 400));
      expect(bo.asked, isNotEmpty);

      await tester.tap(find.text('Voir'));
      await tester.pump(const Duration(milliseconds: 600));

      expect(find.byKey(const Key('bo-input')), findsNothing, reason: 'la fiche couvre la conversation');
    });

    testWidgets('fermé aux visiteurs : Bo invite à se connecter', (tester) async {
      await open(tester, settings: const AiSettings(enabled: true, guestsAllowed: false));

      expect(find.text('Connectez-vous à votre espace voyageur pour discuter avec Bo.'), findsOneWidget);
      expect(find.byKey(const Key('bo-input')), findsNothing);
    });

    testWidgets('la pastille « Suivre ma réservation » invite un visiteur à se connecter', (tester) async {
      final bo = await open(tester);

      await tester.tap(find.text('Suivre ma réservation'));
      await tester.pump(const Duration(milliseconds: 600));

      expect(bo.asked, isEmpty, reason: 'pas de question envoyée : on passe par la connexion');
      expect(find.text('Bonjour !'), findsNothing);
    });

    testWidgets('« Nouvelle conversation » ramène à l\'accueil', (tester) async {
      await open(tester);
      await tester.tap(find.text('Un hôtel à Abidjan'));
      await tester.pump(const Duration(milliseconds: 400));

      await tester.tap(find.byKey(const Key('bo-restart')));
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Bonjour !'), findsOneWidget);
    });
  });
}
