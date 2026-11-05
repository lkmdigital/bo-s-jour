import 'package:bosejour/core/format.dart';
import 'package:bosejour/core/network/api_exception.dart';
import 'package:bosejour/features/accommodations/domain/accommodation_detail.dart';
import 'package:bosejour/features/accommodations/presentation/explore_screen.dart';
import 'package:bosejour/features/auth/data/auth_repository.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

void main() {
  group('Accueil', () {
    testWidgets('affiche les destinations populaires et des hébergements à découvrir', (tester) async {
      await pumpApp(tester);

      expect(find.text('Où allez-vous ?'), findsOneWidget);
      expect(find.text('Destinations populaires'), findsOneWidget);
      expect(find.text('Korhogo'), findsOneWidget);
      expect(find.text('11 hébergements'), findsOneWidget);
      expect(find.text('dès 10 000 FCFA'), findsOneWidget);
      expect(find.text('Hôtel yatchenin vallon'), findsOneWidget);
      expect(find.text('57 000 FCFA / nuit'), findsOneWidget);
      expect(find.text('Nouveau'), findsWidgets, reason: 'sans avis : badge « Nouveau », pas de fausse note');
    });

    testWidgets('une panne du réseau affiche un message et un bouton Réessayer', (tester) async {
      final repo = FakeAccommodationRepository(cities: sampleCities, accommodations: sampleAccommodations, error: ApiException(ApiErrorKind.network, 'Impossible de joindre boséjour. Vérifiez votre connexion internet.'));
      await pumpApp(tester, accommodations: repo);

      expect(find.textContaining('Impossible de joindre boséjour'), findsWidgets);
      expect(find.text('Réessayer'), findsWidgets);

      repo.error = null;
      await tester.tap(find.text('Réessayer').first);
      await tester.pumpAndSettle();
      expect(find.text('Korhogo'), findsOneWidget, reason: 'après « Réessayer », les données arrivent');
    });

    testWidgets('toucher une ville ouvre Explorer avec cette ville recherchée', (tester) async {
      final repo = FakeAccommodationRepository(cities: sampleCities, accommodations: sampleAccommodations);
      final container = await pumpApp(tester, accommodations: repo);

      await tester.tap(find.text('Abidjan'));
      await tester.pumpAndSettle();

      expect(container.read(exploreQueryProvider), 'Abidjan');
      expect(find.text('Explorer'), findsWidgets);
      expect(find.text('Hôtel Ivoire Premium'), findsOneWidget);
      expect(find.text('Villa Asili'), findsNothing, reason: 'Grand-Bassam n\'est pas Abidjan');
      expect(find.text('4,5'), findsOneWidget);
    });
  });

  group('Explorer', () {
    testWidgets('la recherche filtre les résultats (avec un court délai de frappe)', (tester) async {
      final repo = FakeAccommodationRepository(cities: sampleCities, accommodations: sampleAccommodations);
      await pumpApp(tester, accommodations: repo);
      await tester.tap(find.text('Explorer').last);
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), 'bassam');
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pumpAndSettle();

      expect(find.text('Villa Asili'), findsOneWidget);
      expect(find.text('Hôtel Ivoire Premium'), findsNothing);
      expect(repo.searches, contains('bassam'));

      await tester.enterText(find.byType(TextField), 'zzz');
      await tester.pump(const Duration(milliseconds: 600));
      await tester.pumpAndSettle();
      expect(find.text('Aucun hébergement ne correspond à votre recherche.'), findsOneWidget);
    });
  });

  group('Réservations', () {
    testWidgets('sans connexion : invite à se connecter et mène à l\'onglet Compte', (tester) async {
      await pumpApp(tester);
      await tester.tap(find.text('Réservations'));
      await tester.pumpAndSettle();

      expect(find.text('Connectez-vous pour retrouver vos réservations.'), findsOneWidget);
      await tester.tap(find.widgetWithText(FilledButton, 'Accéder à mon espace'));
      await tester.pumpAndSettle();

      expect(find.text('Accéder à mon espace'), findsWidgets);
      expect(find.byKey(const Key('login-email')), findsOneWidget);
    });
  });

  group('Compte et connexion', () {
    testWidgets('le formulaire refuse un e-mail vide ou invalide et un mot de passe vide', (tester) async {
      final auth = FakeAuthRepository();
      await pumpApp(tester, auth: auth);
      await tester.tap(find.text('Compte'));
      await tester.pumpAndSettle();

      await tester.tap(find.widgetWithText(FilledButton, 'Accéder à mon espace'));
      await tester.pumpAndSettle();
      expect(find.text('Saisissez votre e-mail.'), findsOneWidget);
      expect(find.text('Saisissez votre mot de passe.'), findsOneWidget);

      await tester.enterText(find.byKey(const Key('login-email')), 'pas-un-email');
      await tester.tap(find.widgetWithText(FilledButton, 'Accéder à mon espace'));
      await tester.pumpAndSettle();
      expect(find.text('Cette adresse e-mail n\'est pas valide.'), findsOneWidget);
      expect(auth.logins, isEmpty, reason: 'rien n\'est envoyé tant que le formulaire est invalide');
    });

    testWidgets('des identifiants refusés affichent le message du serveur, sans connecter', (tester) async {
      final auth = FakeAuthRepository(loginError: ApiException(ApiErrorKind.rejected, 'Ces identifiants sont incorrects.', statusCode: 422));
      await pumpApp(tester, auth: auth);
      await tester.tap(find.text('Compte'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('login-email')), 'awa@example.com');
      await tester.enterText(find.byKey(const Key('login-password')), 'mauvais');
      await tester.tap(find.widgetWithText(FilledButton, 'Accéder à mon espace'));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('login-error')), findsOneWidget);
      expect(find.text('Ces identifiants sont incorrects.'), findsOneWidget);
      expect(find.text('Se déconnecter'), findsNothing);
    });

    testWidgets('un compte qui demande un code e-mail est expliqué clairement', (tester) async {
      await pumpApp(tester, auth: FakeAuthRepository(loginResult: const LoginNeedsEmailOtp(4)));
      await tester.tap(find.text('Compte'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('login-email')), 'nouveau@example.com');
      await tester.enterText(find.byKey(const Key('login-password')), 'secret');
      await tester.tap(find.widgetWithText(FilledButton, 'Accéder à mon espace'));
      await tester.pumpAndSettle();

      expect(find.textContaining('code de vérification'), findsOneWidget);
    });

    testWidgets('connexion réussie : le compte s\'affiche, puis la déconnexion ramène au formulaire', (tester) async {
      final auth = FakeAuthRepository();
      await pumpApp(tester, auth: auth);
      await tester.tap(find.text('Compte'));
      await tester.pumpAndSettle();

      await tester.enterText(find.byKey(const Key('login-email')), 'awa@example.com');
      await tester.enterText(find.byKey(const Key('login-password')), 'secret');
      await tester.tap(find.widgetWithText(FilledButton, 'Accéder à mon espace'));
      await tester.pumpAndSettle();

      expect(auth.logins.single, ('awa@example.com', 'secret'));
      expect(find.text('Awa Koné'), findsOneWidget);
      expect(find.text('awa@example.com'), findsOneWidget);
      expect(find.text('Voyageur'), findsOneWidget);
      expect(find.text('Version 1.0.0+1'), findsOneWidget);

      await tester.tap(find.byKey(const Key('logout')));
      await tester.pumpAndSettle();
      expect(auth.logouts, 1);
      expect(find.byKey(const Key('login-email')), findsOneWidget);
    });

    testWidgets('une session déjà enregistrée s\'ouvre directement sur le compte', (tester) async {
      await pumpApp(tester, auth: FakeAuthRepository(restored: traveler));
      await tester.tap(find.text('Compte'));
      await tester.pumpAndSettle();

      expect(find.text('Mon compte'), findsOneWidget);
      expect(find.text('Awa Koné'), findsOneWidget);
    });
  });

  testWidgets('la navigation conserve l\'état de chaque onglet', (tester) async {
    await pumpApp(tester);
    await tester.tap(find.text('Explorer').last);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'abidjan');
    await tester.pump(const Duration(milliseconds: 600));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Accueil'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Explorer').last);
    await tester.pumpAndSettle();

    expect(find.widgetWithText(TextField, 'abidjan'), findsOneWidget);
  });

  group('Fiche établissement', () {
    // Les prix s'écrivent avec des espaces insécables : on utilise le même formateur que l'appli.
    final price = formatFcfa(65000, 'fr');
    FakeAccommodationRepository repoWithDetail() => FakeAccommodationRepository(accommodations: const [sampleListItem], details: {37: sampleDetail()});

    Future<void> openFromExplore(WidgetTester tester, FakeAccommodationRepository repo) async {
      await pumpApp(tester, accommodations: repo);
      await tester.tap(find.text('Explorer').last);
      await tester.pumpAndSettle();
      await tester.tap(find.text('LE RANCH HOTEL SAN PEDRO'));
      await tester.pumpAndSettle();
    }

    testWidgets('toucher un hébergement ouvre sa fiche : informations, prix et bouton Réserver', (tester) async {
      final repo = repoWithDetail();
      await openFromExplore(tester, repo);

      expect(repo.detailRequests, [37]);
      expect(find.text('LE RANCH HOTEL SAN PEDRO'), findsOneWidget);
      expect(find.text('SAN PEDRO · Hôtel'), findsOneWidget);
      expect(find.text('28 voyageurs'), findsOneWidget);
      expect(find.text('Arrivée dès 15:00'), findsOneWidget);
      expect(find.text('dès $price FCFA / nuit'), findsOneWidget);
      expect(find.text('Réserver'), findsOneWidget);
      expect(find.byType(NavigationBar), findsNothing, reason: 'la fiche couvre tout l\'écran');
    });

    testWidgets('les sections se lisent en défilant : équipements, chambres, garantie, annulation, avis', (tester) async {
      await openFromExplore(tester, repoWithDetail());

      await tester.scrollUntilVisible(find.text('Équipements et services'), 300);
      expect(find.text('Piscine'), findsOneWidget);
      expect(find.text('Réception 24 h/24'), findsOneWidget);

      await tester.scrollUntilVisible(find.text('CHAMBRE DOUBLE'), 300);
      expect(find.text('$price FCFA / nuit'), findsWidgets);

      await tester.scrollUntilVisible(find.text('Garantie de réservation'), 300);
      expect(find.textContaining('La 1re nuit est réglée en ligne'), findsOneWidget, reason: 'le texte de la garantie vient du serveur (sans répéter son titre)');
      expect(find.textContaining('Garantie de réservation :'), findsNothing);
      expect(find.textContaining('Annulation flexible : gratuite jusqu\'à 48 h'), findsOneWidget);

      await tester.scrollUntilVisible(find.text('Awa Koné'), 300);
      expect(find.textContaining('Séjour très agréable'), findsOneWidget);
      expect(find.textContaining('Merci Awa'), findsOneWidget);
    });

    testWidgets('le bouton retour ramène à la liste', (tester) async {
      await openFromExplore(tester, repoWithDetail());

      await tester.tap(find.bySemanticsLabel('Retour'));
      await tester.pumpAndSettle();

      expect(find.text('dès $price FCFA / nuit'), findsNothing);
      expect(find.text('Explorer'), findsWidgets);
      expect(find.byType(NavigationBar), findsOneWidget);
    });

    testWidgets('un établissement qui n\'est plus publié affiche un message clair (pas le texte technique du serveur)', (tester) async {
      await openFromExplore(tester, FakeAccommodationRepository(accommodations: const [sampleListItem]));

      expect(find.text('Cet établissement n\'est plus disponible.'), findsOneWidget);
      expect(find.textContaining('No query results'), findsNothing);
      expect(find.text('Réessayer'), findsNothing, reason: 'réessayer n\'y changerait rien');
    });

    testWidgets('une panne du réseau propose Réessayer, puis la fiche s\'affiche', (tester) async {
      final repo = repoWithDetail();
      await pumpApp(tester, accommodations: repo);
      await tester.tap(find.text('Explorer').last);
      await tester.pumpAndSettle();
      repo.error = ApiException(ApiErrorKind.network, 'Impossible de joindre boséjour. Vérifiez votre connexion internet.');
      await tester.tap(find.text('LE RANCH HOTEL SAN PEDRO'));
      await tester.pumpAndSettle();

      expect(find.textContaining('Impossible de joindre boséjour'), findsOneWidget);

      repo.error = null;
      await tester.tap(find.text('Réessayer'));
      await tester.pumpAndSettle();
      expect(find.text('dès $price FCFA / nuit'), findsOneWidget);
    });

    testWidgets('sans avis, la fiche le dit au lieu d\'inventer une note', (tester) async {
      final json = sampleDetailJson()..['reviews'] = <Object>[]..['total_reviews'] = 0..['rating'] = '0.00';
      final repo = FakeAccommodationRepository(accommodations: const [sampleListItem], details: {37: AccommodationDetail.fromJson(json)});
      await openFromExplore(tester, repo);

      expect(find.text('Nouveau'), findsWidgets);
      await tester.scrollUntilVisible(find.textContaining('Pas encore d\'avis'), 300);
      expect(find.textContaining('vient d\'arriver sur boséjour'), findsOneWidget);
    });
  });
}
