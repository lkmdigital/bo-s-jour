import 'package:bosejour/core/format.dart';
import 'package:bosejour/core/network/api_exception.dart';
import 'package:bosejour/core/router/app_router.dart';
import 'package:bosejour/features/bookings/data/booking_repository.dart';
import 'package:bosejour/features/bookings/domain/booking.dart';
import 'package:bosejour/l10n/app_localizations.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

void main() {
  final l10n = lookupAppLocalizations(const Locale('fr'));
  final now = DateTime.now();

  group('Réservation (modèle)', () {
    test('les dates ISO du serveur donnent le bon jour, sans décalage de fuseau', () {
      final b = Booking.fromJson({'id': 5, 'status': 'confirmed', 'check_in': '2026-12-12T00:00:00.000000Z', 'check_out': '2026-12-14', 'guests': 2, 'total_price': '108300.00', 'accommodation': {'name': 'Hôtel', 'city': 'Abidjan'}});

      expect(b.checkIn, DateTime(2026, 12, 12));
      expect(b.checkOut, DateTime(2026, 12, 14));
      expect(b.nights, 2);
      expect(b.totalPrice, 108300);
    });

    test('statuts, onglets et actions possibles', () {
      expect(sampleBooking(status: BookingStatus.awaitingHost, paymentStatus: 'pending', paid: 0, code: null).canCancel(now), isTrue);
      expect(sampleBooking(status: BookingStatus.awaitingHost, paymentStatus: 'pending', paid: 0, code: null).needsPayment(now), isFalse, reason: 'on ne paie qu\'après la confirmation de l\'hôte');
      expect(sampleBooking(status: BookingStatus.pending, paymentStatus: 'pending', paid: 0, code: null).needsPayment(now), isTrue);
      expect(sampleBooking(status: BookingStatus.pending, paymentStatus: 'pending', paid: 0, daysAhead: -10).needsPayment(now), isFalse, reason: 'séjour passé');
      expect(sampleBooking().needsPayment(now), isFalse);
      expect(sampleBooking(status: BookingStatus.cancelled).tab(now), BookingTab.cancelled);
      expect(sampleBooking(status: BookingStatus.cancelled).canCancel(now), isFalse);
      expect(sampleBooking(daysAhead: -10).tab(now), BookingTab.past);
      expect(sampleBooking(status: BookingStatus.completed).tab(now), BookingTab.past);
      expect(sampleBooking().tab(now), BookingTab.upcoming);
    });

    test('annulation gratuite : seulement si l\'arrivée est plus loin que le délai de l\'établissement', () {
      expect(sampleBooking(daysAhead: 20, hours: 48).freeCancellation(now), isTrue);
      expect(sampleBooking(daysAhead: 1, hours: 72).freeCancellation(now), isFalse);
      expect(sampleBooking(hours: null).freeCancellation(now), isTrue);
    });
  });

  group('Réseau simulé', () {
    ApiBookingRepository repo(FakeAdapter a) => ApiBookingRepository(Dio(BaseOptions(baseUrl: 'https://api.test/api'))..httpClientAdapter = a, l10n);

    test('la liste lit la page de résultats du serveur', () async {
      final adapter = FakeAdapter({'GET /bookings': ok({'data': [{'id': 1, 'status': 'pending', 'check_in': '2026-12-12', 'check_out': '2026-12-14', 'guests': 2, 'total_price': 100000, 'payment_status': 'pending', 'accommodation': {'id': 16, 'name': 'Hôtel', 'city': 'Abidjan', 'images': [{'url': '/storage/a.jpg', 'is_primary': true}]}, 'room': {'name': 'Standard'}}], 'total': 1})});

      final list = await repo(adapter).mine();

      expect(list.single.accommodationName, 'Hôtel');
      expect(list.single.roomName, 'Standard');
      expect(list.single.imageUrl, endsWith('/storage/a.jpg'));
      expect(adapter.requests.single.queryParameters, {'per_page': 100});
    });

    test('annuler envoie le motif et lit l\'avoir crédité', () async {
      final adapter = FakeAdapter({'POST /bookings/9/cancel': ok({'booking': {'id': 9}, 'credit_created': {'id': 3, 'amount': 108300.0, 'message': 'Un avoir a été crédité sur votre compte.'}})});

      final result = await repo(adapter).cancel(9, ' Erreur de dates ');

      expect(adapter.requests.single.data, {'reason': 'Erreur de dates'});
      expect(result.creditAmount, 108300);
    });

    test('annuler sans avoir : pas de crédit', () async {
      final adapter = FakeAdapter({'POST /bookings/9/cancel': ok({'booking': {'id': 9}, 'credit_created': null})});

      expect((await repo(adapter).cancel(9, '')).creditAmount, isNull);
      expect(adapter.requests.single.data, <String, dynamic>{});
    });
  });

  group('Mes réservations', () {
    final list = [
      sampleBooking(id: 1, name: 'Hôtel A', daysAhead: 5, status: BookingStatus.awaitingHost, paymentStatus: 'pending', paid: 0, code: null),
      sampleBooking(id: 2, name: 'Hôtel B', daysAhead: 30, status: BookingStatus.pending, paymentStatus: 'pending', paid: 0, code: null),
      sampleBooking(id: 3, name: 'Hôtel C', daysAhead: 40),
      sampleBooking(id: 4, name: 'Hôtel D', daysAhead: -30, status: BookingStatus.completed),
      sampleBooking(id: 5, name: 'Hôtel E', daysAhead: 10, status: BookingStatus.cancelled),
    ];

    Future<FakeBookingRepository> open(WidgetTester tester, {List<Booking>? bookings, bool loggedIn = true, String? at}) async {
      final repo = FakeBookingRepository(bookings: bookings ?? list);
      final container = await pumpApp(tester, auth: FakeAuthRepository(restored: loggedIn ? traveler : null), bookings: repo, accommodations: FakeAccommodationRepository(accommodations: const [sampleListItem]));
      container.read(routerProvider).go(at ?? '/bookings');
      await tester.pumpAndSettle();

      return repo;
    }

    testWidgets('trois onglets avec leurs compteurs ; « à venir » trié par date d\'arrivée', (tester) async {
      await open(tester);

      expect(find.text('À venir (3)'), findsOneWidget);
      expect(find.text('Passées (1)'), findsOneWidget);
      expect(find.text('Annulées (1)'), findsOneWidget);
      expect(find.text('Hôtel A'), findsOneWidget);
      expect(find.text('Hôtel D'), findsNothing);
      expect(tester.getTopLeft(find.text('Hôtel A')).dy, lessThan(tester.getTopLeft(find.text('Hôtel B')).dy));
    });

    testWidgets('statuts lisibles : à confirmer, à payer, confirmée', (tester) async {
      await open(tester);

      expect(find.text('À confirmer par l\'hôte'), findsOneWidget);
      expect(find.text('À payer'), findsOneWidget);
      expect(find.text('Confirmée'), findsOneWidget);
    });

    testWidgets('changer d\'onglet montre les séjours passés et annulés', (tester) async {
      await open(tester);

      await tester.tap(find.text('Passées (1)'));
      await tester.pumpAndSettle();
      expect(find.text('Hôtel D'), findsOneWidget);
      expect(find.text('Terminée'), findsOneWidget);

      await tester.tap(find.text('Annulées (1)'));
      await tester.pumpAndSettle();
      expect(find.text('Hôtel E'), findsOneWidget);
      expect(find.text('Annulée'), findsOneWidget);
    });

    testWidgets('aucun séjour : message clair et lien vers l\'exploration', (tester) async {
      await open(tester, bookings: const []);

      expect(find.byKey(const Key('bookings-empty')), findsOneWidget);
      expect(find.text('Aucun séjour à venir'), findsOneWidget);
      await tester.tap(find.text('Explorer les séjours'));
      await tester.pumpAndSettle();
      expect(find.text('Explorer'), findsWidgets);
    });

    testWidgets('sans connexion : invite à se connecter', (tester) async {
      await open(tester, loggedIn: false);

      expect(find.text('Connectez-vous pour retrouver vos réservations.'), findsOneWidget);
    });

    testWidgets('le détail d\'une réservation confirmée montre le code d\'arrivée et les montants, sans bouton Payer', (tester) async {
      await open(tester);

      await tester.tap(find.byKey(const Key('booking-3')));
      await tester.pumpAndSettle();

      expect(find.text('Hôtel C'), findsOneWidget);
      expect(find.byKey(const Key('booking-code')), findsOneWidget);
      expect(find.text('BS-4Q7K'), findsOneWidget);
      expect(find.text('${formatFcfa(108300, 'fr')} FCFA'), findsWidgets);
      expect(find.byKey(const Key('booking-pay')), findsNothing);
      expect(find.byKey(const Key('booking-cancel')), findsOneWidget);
    });

    testWidgets('en attente de l\'hôte : pas de code ni de paiement, mais la consigne', (tester) async {
      await open(tester);

      await tester.tap(find.byKey(const Key('booking-1')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('booking-note')), findsOneWidget);
      expect(find.textContaining('L\'hôte doit confirmer'), findsOneWidget);
      expect(find.byKey(const Key('booking-code')), findsNothing);
      expect(find.byKey(const Key('booking-pay')), findsNothing);
    });

    testWidgets('confirmée par l\'hôte mais pas payée : le bouton Payer apparaît', (tester) async {
      await open(tester);

      await tester.tap(find.byKey(const Key('booking-2')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('booking-pay')), findsOneWidget);
      expect(find.textContaining('Réglez pour valider'), findsOneWidget);
    });

    testWidgets('une réservation annulée n\'a plus d\'action', (tester) async {
      await open(tester, at: '/bookings/5');

      expect(find.byKey(const Key('booking-cancel')), findsNothing);
      expect(find.byKey(const Key('booking-pay')), findsNothing);
    });
  });

  group('Annuler une réservation', () {
    Future<FakeBookingRepository> open(WidgetTester tester, Booking booking, {FakeBookingRepository? repo}) async {
      final r = repo ?? FakeBookingRepository(bookings: [booking]);
      final container = await pumpApp(tester, auth: FakeAuthRepository(restored: traveler), bookings: r, accommodations: FakeAccommodationRepository(accommodations: const [sampleListItem]));
      container.read(routerProvider).go('/bookings/${booking.id}/cancel');
      await tester.pumpAndSettle();

      return r;
    }

    Future<void> fillAndSubmit(WidgetTester tester, {int reason = 1}) async {
      await tester.tap(find.byKey(Key('reason-$reason')));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('cancel-confirm')));
      await tester.tap(find.byKey(const Key('cancel-confirm')));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('cancel-submit')));
      await tester.tap(find.byKey(const Key('cancel-submit')));
      await tester.pumpAndSettle();
    }

    testWidgets('annulation gratuite : la politique annonce l\'avoir ; le bouton attend le motif et la confirmation', (tester) async {
      await open(tester, sampleBooking());

      expect(find.text('Annulation gratuite'), findsOneWidget);
      expect(find.textContaining('${formatFcfa(108300, 'fr')} FCFA sera crédité'), findsOneWidget);
      expect(tester.widget<FilledButton>(find.byKey(const Key('cancel-submit'))).onPressed, isNull);

      await tester.tap(find.byKey(const Key('reason-1')));
      await tester.pumpAndSettle();
      expect(tester.widget<FilledButton>(find.byKey(const Key('cancel-submit'))).onPressed, isNull, reason: 'la confirmation manque encore');
    });

    testWidgets('annuler : le motif part au serveur et l\'avoir est annoncé', (tester) async {
      final repo = FakeBookingRepository(bookings: [sampleBooking()], cancelResult: const CancelResult(creditAmount: 108300));
      await open(tester, sampleBooking(), repo: repo);

      await fillAndSubmit(tester);

      expect(repo.cancellations, [(1871, 'Erreur de dates')]);
      expect(find.byKey(const Key('cancel-done')), findsOneWidget);
      expect(find.textContaining('${formatFcfa(108300, 'fr')} FCFA a été crédité'), findsOneWidget);
    });

    testWidgets('« Autre » exige un motif écrit', (tester) async {
      final repo = FakeBookingRepository(bookings: [sampleBooking()]);
      await open(tester, sampleBooking(), repo: repo);

      await tester.tap(find.byKey(const Key('reason-4')));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('cancel-confirm')));
      await tester.tap(find.byKey(const Key('cancel-confirm')));
      await tester.pumpAndSettle();
      expect(tester.widget<FilledButton>(find.byKey(const Key('cancel-submit'))).onPressed, isNull);

      await tester.enterText(find.byKey(const Key('cancel-other')), 'Décès dans la famille');
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byKey(const Key('cancel-submit')));
      await tester.tap(find.byKey(const Key('cancel-submit')));
      await tester.pumpAndSettle();

      expect(repo.cancellations.single.$2, 'Décès dans la famille');
    });

    testWidgets('réservation non remboursable : le message le dit clairement', (tester) async {
      await open(tester, sampleBooking(nonRefundable: true));

      expect(find.text('Réservation non remboursable'), findsOneWidget);
      expect(find.textContaining('ne seront pas remboursés'), findsOneWidget);
    });

    testWidgets('délai d\'annulation dépassé : le message le dit', (tester) async {
      await open(tester, sampleBooking(daysAhead: 1, hours: 72));

      expect(find.text('Délai d\'annulation dépassé'), findsOneWidget);
    });

    testWidgets('sans paiement, aucune promesse d\'avoir', (tester) async {
      await open(tester, sampleBooking(status: BookingStatus.awaitingHost, paymentStatus: 'pending', paid: 0, code: null));

      expect(find.text('Annulation gratuite'), findsOneWidget);
      expect(find.textContaining('avoir'), findsNothing);
    });

    testWidgets('un refus du serveur s\'affiche et on reste sur le formulaire', (tester) async {
      final repo = FakeBookingRepository(bookings: [sampleBooking()], cancelError: ApiException(ApiErrorKind.rejected, 'Cette réservation ne peut plus être annulée en ligne.', statusCode: 422));
      await open(tester, sampleBooking(), repo: repo);

      await fillAndSubmit(tester);

      expect(find.textContaining('ne peut plus être annulée en ligne'), findsOneWidget);
      expect(find.byKey(const Key('cancel-done')), findsNothing);
    });

    testWidgets('une réservation déjà annulée ne peut plus l\'être', (tester) async {
      await open(tester, sampleBooking(status: BookingStatus.cancelled));

      expect(find.byKey(const Key('cancel-impossible')), findsOneWidget);
      expect(find.byKey(const Key('cancel-submit')), findsNothing);
    });
  });
}
