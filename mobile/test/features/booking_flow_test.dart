import 'package:bosejour/core/format.dart';
import 'package:bosejour/core/network/api_exception.dart';
import 'package:bosejour/core/router/app_router.dart';
import 'package:bosejour/features/auth/domain/user.dart';
import 'package:bosejour/features/bookings/data/booking_repository.dart';
import 'package:bosejour/features/bookings/domain/booking_request.dart';
import 'package:bosejour/features/bookings/domain/price_quote.dart';
import 'package:bosejour/l10n/app_localizations.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

void main() {
  final l10n = lookupAppLocalizations(const Locale('fr'));

  group('Devis et demande (réseau simulé)', () {
    ApiBookingRepository repo(FakeAdapter a) => ApiBookingRepository(Dio(BaseOptions(baseUrl: 'https://api.test/api'))..httpClientAdapter = a, l10n);

    test('le devis vient du serveur : montants, remise d\'invitation, paiement intégral et garantie', () async {
      final adapter = FakeAdapter({
        'GET /accommodations/16/price-preview': ok({
          'effective_price_per_night': 57000, 'nights': 2, 'total': 114000, 'extra_breakfast_total': 0, 'cancellation_policy_hours': 48,
          'long_stay_discount': null,
          'referral_discount': {'amount': 2850, 'percent': 5, 'label': 'Invitation de Aminata K.'},
          'payment_options': {'full_only': false, 'options': {'full': {'label': 'Paiement intégral', 'amount': 105450, 'original_amount': 111150, 'discount_percent': 5}, 'guarantee': {'label': 'Garantie', 'amount': 57000, 'summary': '1re nuit', 'balance_at_hotel': 54150}}},
        }),
      });

      final q = await repo(adapter).quote(QuoteParams(accommodationId: 16, checkIn: DateTime(2026, 12, 12), checkOut: DateTime(2026, 12, 14), roomId: 5, referralCode: 'aminata5'));

      expect(adapter.requests.single.queryParameters, {'check_in': '2026-12-12', 'check_out': '2026-12-14', 'room_id': 5, 'referral_code': 'AMINATA5'});
      expect(q.nights, 2);
      expect(q.referralAmount, 2850);
      expect(q.payable, 111150, reason: 'total − remise d\'invitation, comme le serveur');
      expect(q.full!.amount, 105450);
      expect(q.guarantee!.balanceAtHotel, 54150);
    });

    test('une invitation refusée n\'est pas déduite du total', () {
      final q = PriceQuote.fromJson({'nights': 1, 'total': 50000, 'effective_price_per_night': 50000, 'referral_discount': {'error': 'Ce code n\'est pas valable.'}});

      expect(q.referralAmount, 0);
      expect(q.payable, 50000);
      expect(q.referral!.error, 'Ce code n\'est pas valable.');
    });

    test('la demande envoie les champs de l\'API et jamais un prix', () async {
      final adapter = FakeAdapter({'POST /bookings': status(201, {'id': 1871, 'status': 'awaiting_host_confirmation', 'access_token': 'abc', 'accommodation': {'name': 'Hôtel Les Cocotiers'}})});

      final created = await repo(adapter).create(BookingRequest(
        accommodationId: 16, roomId: 5, checkIn: DateTime(2026, 12, 12), checkOut: DateTime(2026, 12, 14), guests: 3, children: 1, rooms: 1,
        phone: ' +2250707000000 ', residenceCountry: 'Côte d\'Ivoire', arrivalTime: '21:00', specialRequests: ' Arrivée tardive ', referralCode: 'aminata5',
        forThirdParty: true, travelerName: ' Ibrahim Traoré ', travelerPhone: '+2250101010101',
      ));

      expect(created.id, 1871);
      expect(created.accessToken, 'abc');
      expect(adapter.requests.single.data, {
        'accommodation_id': 16, 'room_id': 5, 'check_in': '2026-12-12', 'check_out': '2026-12-14', 'guests': 3, 'children': 1,
        'traveler_type': 'individual', 'residence_country': 'Côte d\'Ivoire', 'phone': '+2250707000000', 'estimated_arrival_time': '21:00',
        'special_requests': 'Arrivée tardive', 'referral_code': 'AMINATA5', 'booked_for_third_party': true, 'traveler_name': 'Ibrahim Traoré', 'traveler_phone': '+2250101010101',
      });
      expect((adapter.requests.single.data as Map).keys.where((k) => k.toString().contains('price') || k.toString().contains('total')), isEmpty);
    });

    test('un refus du serveur (dates indisponibles) remonte son message', () async {
      final adapter = FakeAdapter({'POST /bookings': status(400, {'message': 'Cet établissement n\'est plus disponible pour les dates sélectionnées.'})});

      await expectLater(
        repo(adapter).create(BookingRequest(accommodationId: 16, checkIn: DateTime(2026, 12, 12), checkOut: DateTime(2026, 12, 14), guests: 2, phone: '+2250707000000', residenceCountry: 'CI')),
        throwsA(isA<ApiException>().having((e) => e.message, 'message', startsWith('Cet établissement'))),
      );
    });
  });

  group('Réservation dans l\'appli', () {
    final from = DateTime.now().add(const Duration(days: 20));
    final to = from.add(const Duration(days: 2));
    String d(DateTime x) => apiDate(x);
    String path([String extra = '']) => '/accommodations/37/book?check_in=${d(from)}&check_out=${d(to)}&guests=2$extra';

    Future<(FakeBookingRepository, FakeAuthRepository)> open(WidgetTester tester, {bool loggedIn = true, String? at, FakeBookingRepository? bookings}) async {
      final repo = bookings ?? FakeBookingRepository();
      final auth = FakeAuthRepository(restored: loggedIn ? const User(id: 1, name: 'Awa Koné', email: 'awa@example.com', role: 'user', phone: '+2250707000000') : null);
      final container = await pumpApp(tester, auth: auth, bookings: repo, accommodations: FakeAccommodationRepository(details: {37: sampleDetail()}));
      container.read(routerProvider).go(at ?? path());
      await tester.pumpAndSettle();

      return (repo, auth);
    }

    testWidgets('sans compte, la réservation invite à se connecter ou créer son espace', (tester) async {
      await open(tester, loggedIn: false);

      expect(find.text('Connectez-vous pour réserver'), findsOneWidget);
      expect(find.byKey(const Key('gate-login')), findsOneWidget);
      expect(find.byKey(const Key('gate-register')), findsOneWidget);
      expect(find.byKey(const Key('book-next')), findsNothing);
    });

    testWidgets('le bouton Réserver de la fiche ouvre la réservation dans l\'appli (plus le site)', (tester) async {
      final container = await pumpApp(tester, auth: FakeAuthRepository(restored: traveler), accommodations: FakeAccommodationRepository(accommodations: const [sampleListItem], details: {37: sampleDetail()}));
      container.read(routerProvider).go('/accommodations/37');
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('detail-book')));
      await tester.pumpAndSettle();

      expect(find.text('Votre séjour'), findsOneWidget);
    });

    testWidgets('dates et voyageurs déjà connus : l\'étape 1 les affiche et le bouton Continuer est actif', (tester) async {
      await open(tester);

      expect(find.text('Votre séjour'), findsOneWidget);
      expect(find.textContaining('2 nuits'), findsOneWidget);
      expect(tester.widget<FilledButton>(find.byKey(const Key('book-next'))).onPressed, isNotNull);
    });

    testWidgets('sans dates, on ne peut pas continuer', (tester) async {
      await open(tester, at: '/accommodations/37/book');

      expect(tester.widget<FilledButton>(find.byKey(const Key('book-next'))).onPressed, isNull);
    });

    testWidgets('le nombre de voyageurs est borné par la capacité de la chambre', (tester) async {
      await open(tester, at: path('&room=90')); // chambre double : 2 personnes

      expect(find.textContaining('2 personnes au maximum'), findsOneWidget);
      await tester.tap(find.byKey(const Key('Adultes-plus')));
      await tester.pump();
      expect(tester.widget<IconButton>(find.byKey(const Key('Adultes-plus'))).onPressed, isNull);
    });

    testWidgets('parcours complet : séjour → voyageur → récapitulatif du serveur → demande envoyée', (tester) async {
      final (repo, _) = await open(tester);

      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();
      expect(find.text('Qui voyage ?'), findsOneWidget);
      expect((tester.widget<TextFormField>(find.byKey(const Key('book-phone'))).controller!.text), '+2250707000000', reason: 'le téléphone du compte est prérempli');

      await tester.enterText(find.byKey(const Key('book-requests')), 'Arrivée tardive');
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();

      expect(find.text('Récapitulatif'), findsOneWidget);
      final price = formatFcfa(57000, 'fr');
      expect(find.textContaining('$price FCFA × 2 nuits'), findsOneWidget);
      expect(find.text('${formatFcfa(114000, 'fr')} FCFA'), findsWidgets);
      expect(find.byKey(const Key('book-pay-info')), findsOneWidget);
      expect(find.textContaining('${formatFcfa(108300, 'fr')} FCFA (−5 %)'), findsOneWidget, reason: 'paiement intégral annoncé par le serveur');
      expect(find.textContaining('${formatFcfa(57000, 'fr')} FCFA, le solde'), findsOneWidget);

      await tester.tap(find.byKey(const Key('book-submit')));
      await tester.pumpAndSettle();

      final sent = repo.created.single;
      expect(sent.accommodationId, 37);
      expect(sent.guests, 2);
      expect(sent.phone, '+2250707000000');
      expect(sent.residenceCountry, 'Côte d\'Ivoire');
      expect(sent.specialRequests, 'Arrivée tardive');
      expect(sent.forThirdParty, isFalse);
      expect(find.byKey(const Key('book-sent')), findsOneWidget);
      expect(find.text('Demande envoyée !'), findsOneWidget);
    });

    testWidgets('réserver pour une autre personne exige son nom et son téléphone', (tester) async {
      final (repo, _) = await open(tester);
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('book-who-other')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();
      expect(find.text('Qui voyage ?'), findsOneWidget, reason: 'champs obligatoires vides : on reste sur l\'étape');

      await tester.enterText(find.byKey(const Key('book-traveler-name')), 'Ibrahim Traoré');
      await tester.enterText(find.byKey(const Key('book-traveler-phone')), '01 01 01 01 01');
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('book-submit')));
      await tester.pumpAndSettle();

      expect(repo.created.single.forThirdParty, isTrue);
      expect(repo.created.single.travelerName, 'Ibrahim Traoré');
      expect(repo.created.single.travelerPhone, '+2250101010101');
    });

    testWidgets('un code d\'invitation est envoyé au serveur, qui renvoie le nouveau total', (tester) async {
      final repo = FakeBookingRepository();
      await open(tester, bookings: repo);
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();

      repo.quoteResult = PriceQuote.fromJson({'nights': 2, 'total': 114000, 'effective_price_per_night': 57000, 'referral_discount': {'amount': 2850, 'percent': 5, 'label': 'Invitation de Aminata K.'}});
      await tester.enterText(find.byKey(const Key('book-code')), 'aminata5');
      await tester.tap(find.byKey(const Key('book-code-apply')));
      await tester.pumpAndSettle();

      expect(repo.quotes.last.referralCode, 'AMINATA5');
      expect(find.textContaining('Invitation de Aminata K.'), findsOneWidget);
      expect(find.text('${formatFcfa(111150, 'fr')} FCFA'), findsOneWidget);
    });

    testWidgets('un code refusé affiche le message du serveur', (tester) async {
      final repo = FakeBookingRepository();
      await open(tester, bookings: repo);
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();

      repo.quoteResult = PriceQuote.fromJson({'nights': 2, 'total': 114000, 'effective_price_per_night': 57000, 'referral_discount': {'error': 'Ce code n\'existe pas.'}});
      await tester.enterText(find.byKey(const Key('book-code')), 'xxx');
      await tester.tap(find.byKey(const Key('book-code-apply')));
      await tester.pumpAndSettle();

      expect(find.byKey(const Key('book-code-error')), findsOneWidget);
      expect(find.text('${formatFcfa(114000, 'fr')} FCFA'), findsWidgets, reason: 'aucune remise déduite');
    });

    testWidgets('un refus du serveur à l\'envoi (dates prises) s\'affiche sans quitter le récapitulatif', (tester) async {
      final repo = FakeBookingRepository(createError: ApiException(ApiErrorKind.rejected, 'Cet établissement n\'est plus disponible pour les dates sélectionnées.', statusCode: 400));
      await open(tester, bookings: repo);
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('book-submit')));
      await tester.pumpAndSettle();

      expect(find.textContaining('n\'est plus disponible'), findsOneWidget);
      expect(find.byKey(const Key('book-sent')), findsNothing);
      expect(find.text('Récapitulatif'), findsOneWidget);
    });

    testWidgets('si le devis échoue, on ne peut pas envoyer la demande', (tester) async {
      final repo = FakeBookingRepository(quoteError: ApiException(ApiErrorKind.rejected, 'Dates indisponibles.', statusCode: 422));
      await open(tester, bookings: repo);
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();

      expect(find.text('Dates indisponibles.'), findsOneWidget);
      expect(tester.widget<FilledButton>(find.byKey(const Key('book-submit'))).onPressed, isNull);
    });

    testWidgets('le retour revient à l\'étape précédente, puis à la fiche', (tester) async {
      await open(tester);
      await tester.tap(find.byKey(const Key('book-next')));
      await tester.pumpAndSettle();
      expect(find.text('Qui voyage ?'), findsOneWidget);

      await tester.tap(find.byKey(const Key('book-back')));
      await tester.pumpAndSettle();

      expect(find.text('Votre séjour'), findsOneWidget);
    });
  });
}
