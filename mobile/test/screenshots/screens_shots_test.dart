@Tags(['screenshots'])
library;

import 'package:bosejour/app.dart';
import 'package:flutter/material.dart';
import 'package:bosejour/features/auth/data/auth_repository.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

/// Captures d'écran des écrans principaux (dossier out/, ignoré par git) :
///   flutter test --tags screenshots --update-goldens test/screenshots
void main() {
  Future<void> shot(WidgetTester tester, String name) => expectLater(find.byType(BoSejourApp), matchesGoldenFile('out/$name.png'));

  testWidgets('accueil', (tester) async {
    await pumpApp(tester);
    await shot(tester, '1-accueil');
  });

  testWidgets('explorer', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Explorer').last);
    await tester.pumpAndSettle();
    await shot(tester, '2-explorer');
  });

  testWidgets('réservations', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Réservations'));
    await tester.pumpAndSettle();
    await shot(tester, '3-reservations');
  });

  testWidgets('connexion', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Compte'));
    await tester.pumpAndSettle();
    await shot(tester, '4-connexion');
  });

  testWidgets('connexion avec une erreur', (tester) async {
    await pumpApp(tester, auth: FakeAuthRepository(loginResult: const LoginNeedsTwoFactor()));
    await tester.tap(find.text('Compte'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('login-email')), 'awa@example.com');
    await tester.enterText(find.byKey(const Key('login-password')), 'secret');
    await tester.tap(find.widgetWithText(FilledButton, 'Accéder à mon espace'));
    await tester.pumpAndSettle();
    await shot(tester, '5-connexion-erreur');
  });

  testWidgets('mon compte', (tester) async {
    await pumpApp(tester, auth: FakeAuthRepository(restored: traveler));
    await tester.tap(find.text('Compte'));
    await tester.pumpAndSettle();
    await shot(tester, '6-compte');
  });
}
