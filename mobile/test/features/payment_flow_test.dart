import 'package:bosejour/core/format.dart';
import 'package:bosejour/core/network/api_exception.dart';
import 'package:bosejour/core/router/app_router.dart';
import 'package:bosejour/features/bookings/domain/booking.dart';
import 'package:bosejour/features/bookings/domain/price_quote.dart';
import 'package:bosejour/features/payments/data/payment_repository.dart';
import 'package:bosejour/features/payments/domain/payment_models.dart';
import 'package:bosejour/l10n/app_localizations.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import '../helpers/fakes.dart';

void main() {
  final l10n = lookupAppLocalizations(const Locale('fr'));

  group('Passerelle (réseau simulé)', () {
    ApiPaymentRepository repo(FakeAdapter a) => ApiPaymentRepository(Dio(BaseOptions(baseUrl: 'https://api.test/api'))..httpClientAdapter = a, l10n);

    test('les moyens de paiement actifs sont listés, avec l\'adresse de leur logo', () async {
      final adapter = FakeAdapter({
        'GET /payment-methods': ok([
          {'id': 1, 'name': 'Wave CI', 'slug': 'wave-ci', 'icon': '/images/payment-methods/wave-ci.png', 'is_active': true},
          {'id': 2, 'name': 'Moov', 'slug': 'moov-ci', 'icon': null, 'is_active': false},
          {'id': 5, 'name': 'MTN MoMo', 'slug': 'mtn-ci', 'icon': null, 'is_active': true},
        ]),
      });

      final list = await repo(adapter).methods();

      expect(list.map((m) => m.slug), ['wave-ci', 'mtn-ci'], reason: 'un moyen désactivé n\'est jamais proposé');
      expect(list.first.iconUrl, endsWith('/images/payment-methods/wave-ci.png'));
      expect(list.last.isPush, isTrue);
    });

    test('initier un paiement envoie le choix (jamais un montant) et lit le lien', () async {
      final adapter = FakeAdapter({'POST /bookings/1871/payment/initiate': ok({'payment': {'id': 501}, 'payment_url': 'https://pay.example/x', 'link': 'https://pay.example/x', 'awaiting_phone_validation': false, 'requires_otp': false})});

      final init = await repo(adapter).initiate(1871, method: 'wave-ci', plan: PaymentPlan.guarantee);

      expect(adapter.requests.single.data, {'payment_method': 'wave-ci', 'payment_type': 'guarantee'});
      expect(init.paymentId, 501);
      expect(init.link, 'https://pay.example/x');
      expect(init.awaitingPhone, isFalse);
    });

    test('MTN : pas de lien, validation sur le téléphone', () async {
      final adapter = FakeAdapter({'POST /bookings/1/payment/initiate': ok({'payment': {'id': 7}, 'link': '', 'payment_url': '', 'awaiting_phone_validation': true, 'requires_otp': false})});

      final init = await repo(adapter).initiate(1, method: 'mtn-ci', plan: PaymentPlan.full);

      expect(init.link, isNull);
      expect(init.awaitingPhone, isTrue);
    });

    test('le message « error » du serveur (adressé au voyageur) est repris tel quel', () async {
      final adapter = FakeAdapter({'POST /bookings/1/payment/initiate': status(400, {'error': 'Le montant à régler est inférieur au minimum accepté par la passerelle de paiement (100 FCFA).'})});

      await expectLater(repo(adapter).initiate(1, method: 'wave-ci', plan: PaymentPlan.full), throwsA(isA<ApiException>().having((e) => e.message, 'message', startsWith('Le montant à régler'))));
    });

    test('une réservation pas encore confirmée par l\'hôte : le message « message » du serveur', () async {
      final adapter = FakeAdapter({'POST /bookings/1/payment/initiate': status(400, {'message': 'Votre demande est en attente de confirmation par le partenaire.'})});

      await expectLater(repo(adapter).initiate(1, method: 'wave-ci', plan: PaymentPlan.full), throwsA(isA<ApiException>().having((e) => e.message, 'message', contains('en attente de confirmation'))));
    });

    test('statut : completed, failed, et tout le reste = en attente', () async {
      for (final (raw, expected) in [('completed', PaymentState.completed), ('failed', PaymentState.failed), ('pending', PaymentState.pending), ('processing', PaymentState.pending)]) {
        final adapter = FakeAdapter({'GET /payments/9': ok({'id': 9, 'status': raw})});
        expect(await repo(adapter).status(9), expected);
      }
    });

    test('repli : le lien est repris par /process quand l\'initiation ne l\'a pas renvoyé', () async {
      final adapter = FakeAdapter({'POST /payments/9/process': ok({'redirect_url': 'https://pay.example/r'})});

      expect(await repo(adapter).link(9, 'wave-ci'), 'https://pay.example/r');
    });
  });

  group('Payer dans l\'appli', () {
    final payable = sampleBooking(status: BookingStatus.pending, paymentStatus: 'pending', paid: 0, code: null);

    Future<FakePaymentRepository> open(WidgetTester tester, {Booking? booking, FakePaymentRepository? payments}) async {
      openedUrls.clear();
      final pay = payments ?? FakePaymentRepository();
      final container = await pumpApp(
        tester,
        auth: FakeAuthRepository(restored: traveler),
        bookings: FakeBookingRepository(bookings: [booking ?? payable]),
        payments: pay,
        accommodations: FakeAccommodationRepository(accommodations: const [sampleListItem]),
      );
      container.read(routerProvider).go('/bookings/${(booking ?? payable).id}/pay');
      await tester.pumpAndSettle();

      return pay;
    }

    Future<void> tapPay(WidgetTester tester) async {
      await tester.tap(find.byKey(const Key('pay-submit')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
    }

    testWidgets('les deux offres du serveur : paiement intégral à −5 % et garantie avec son solde', (tester) async {
      await open(tester);

      expect(find.text('Comment souhaitez-vous payer ?'), findsOneWidget);
      expect(find.textContaining('Recommandé · −5 %'), findsOneWidget);
      expect(find.text('${formatFcfa(108300, 'fr')} FCFA'), findsOneWidget);
      expect(find.text('${formatFcfa(114000, 'fr')} FCFA'), findsOneWidget, reason: 'prix barré');
      expect(find.text('${formatFcfa(57000, 'fr')} FCFA'), findsOneWidget);
      expect(find.textContaining('solde de ${formatFcfa(57000, 'fr')} FCFA se règle à l\'établissement'), findsOneWidget);
      expect(find.text('Payer ${formatFcfa(108300, 'fr')} FCFA'), findsOneWidget, reason: 'le paiement intégral est choisi par défaut');
    });

    testWidgets('choisir la garantie change le montant du bouton', (tester) async {
      await open(tester);

      await tester.tap(find.byKey(const Key('plan-guarantee')));
      await tester.pumpAndSettle();

      expect(find.text('Payer ${formatFcfa(57000, 'fr')} FCFA'), findsOneWidget);
    });

    testWidgets('paiement intégral obligatoire : la garantie n\'est pas proposée', (tester) async {
      await open(tester, booking: sampleBooking(status: BookingStatus.pending, paymentStatus: 'pending', paid: 0, code: null, options: PaymentOptionsFixtures.fullOnly()));

      expect(find.byKey(const Key('plan-guarantee')), findsNothing);
      expect(find.byKey(const Key('plan-full')), findsOneWidget);
    });

    testWidgets('Wave : la page de paiement s\'ouvre, puis l\'appli attend et confirme', (tester) async {
      final pay = FakePaymentRepository(states: [PaymentState.pending, PaymentState.pending, PaymentState.completed]);
      await open(tester, payments: pay);

      await tapPay(tester);

      expect(pay.initiations, [(1871, 'wave-ci', PaymentPlan.full)]);
      expect(openedUrls.single.toString(), 'https://pay.example/checkout/abc');
      expect(find.byKey(const Key('pay-waiting')), findsOneWidget);
      expect(find.byKey(const Key('pay-reopen')), findsOneWidget);

      await tester.pump(const Duration(seconds: 5));
      expect(find.byKey(const Key('pay-waiting')), findsOneWidget, reason: 'toujours en attente');
      await tester.pump(const Duration(seconds: 5));
      await tester.pump(const Duration(seconds: 5));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.byKey(const Key('pay-done')), findsOneWidget);
      expect(find.text('Paiement reçu'), findsOneWidget);
      await tester.pumpAndSettle();
    });

    testWidgets('le choix de garantie est bien envoyé au serveur', (tester) async {
      final pay = await open(tester);

      await tester.tap(find.byKey(const Key('plan-guarantee')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('method-orange-ci')));
      await tester.pumpAndSettle();
      await tapPay(tester);

      expect(pay.initiations, [(1871, 'orange-ci', PaymentPlan.guarantee)]);
    });

    testWidgets('MTN : aucune page à ouvrir, on demande de valider sur le téléphone', (tester) async {
      final pay = FakePaymentRepository(initiation: const PaymentInitiation(paymentId: 502, awaitingPhone: true));
      await open(tester, payments: pay);

      await tester.tap(find.byKey(const Key('method-mtn-ci')));
      await tester.pumpAndSettle();
      await tapPay(tester);

      expect(openedUrls, isEmpty);
      expect(find.text('Validez sur votre téléphone'), findsOneWidget);
      expect(find.textContaining('MTN MoMo'), findsWidgets);
      expect(find.byKey(const Key('pay-reopen')), findsNothing);
    });

    testWidgets('« J\'ai terminé le paiement » vérifie tout de suite', (tester) async {
      final pay = FakePaymentRepository(states: [PaymentState.completed]);
      await open(tester, payments: pay);
      await tapPay(tester);

      await tester.tap(find.byKey(const Key('pay-check')));
      await tester.pump(const Duration(milliseconds: 100));

      expect(pay.statusReads, 1);
      expect(find.byKey(const Key('pay-done')), findsOneWidget);
      await tester.pumpAndSettle();
    });

    testWidgets('un paiement refusé : message clair et on peut réessayer', (tester) async {
      final pay = FakePaymentRepository(states: [PaymentState.failed]);
      await open(tester, payments: pay);
      await tapPay(tester);

      await tester.pump(const Duration(seconds: 5));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.byKey(const Key('pay-failed')), findsOneWidget);
      await tester.tap(find.byKey(const Key('pay-retry')));
      await tester.pumpAndSettle();
      expect(find.text('Comment souhaitez-vous payer ?'), findsOneWidget);
    });

    testWidgets('au bout de 11 minutes sans réponse : le message d\'attente et retour au choix', (tester) async {
      final pay = FakePaymentRepository(states: [PaymentState.pending]);
      await open(tester, payments: pay);
      await tapPay(tester);

      for (var i = 0; i < 140; i++) {
        await tester.pump(const Duration(seconds: 5));
      }
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.textContaining('délai de validation est dépassé'), findsOneWidget);
      expect(find.byKey(const Key('pay-submit')), findsOneWidget);
    });

    testWidgets('un refus du serveur à l\'initiation s\'affiche, sans ouvrir de page', (tester) async {
      final pay = FakePaymentRepository(initiateError: ApiException(ApiErrorKind.rejected, 'Cette réservation n\'est plus disponible', statusCode: 400));
      await open(tester, payments: pay);

      await tapPay(tester);

      expect(find.text('Cette réservation n\'est plus disponible'), findsOneWidget);
      expect(openedUrls, isEmpty);
      expect(find.byKey(const Key('pay-waiting')), findsNothing);
    });

    testWidgets('un moyen qui demande un code SMS (PeyaPay) n\'est pas géré : message clair', (tester) async {
      final pay = FakePaymentRepository(initiation: const PaymentInitiation(paymentId: 503, requiresOtp: true));
      await open(tester, payments: pay);

      await tapPay(tester);

      expect(find.textContaining('pas encore disponible dans l\'appli'), findsOneWidget);
      expect(openedUrls, isEmpty);
    });

    testWidgets('lien absent de l\'initiation : repris via /process', (tester) async {
      final pay = FakePaymentRepository(initiation: const PaymentInitiation(paymentId: 504));
      await open(tester, payments: pay);

      await tapPay(tester);

      expect(pay.linkRequests, [(504, 'wave-ci')]);
      expect(openedUrls.single.toString(), 'https://pay.example/fallback');
    });

    testWidgets('déjà payée ou pas encore confirmée par l\'hôte : pas de paiement possible', (tester) async {
      await open(tester, booking: sampleBooking());
      expect(find.byKey(const Key('pay-notice')), findsOneWidget);
      expect(find.text('Cette réservation est déjà payée.'), findsOneWidget);
      expect(find.byKey(const Key('pay-submit')), findsNothing);
    });

    testWidgets('en attente de l\'hôte : on explique qu\'il faut attendre', (tester) async {
      await open(tester, booking: sampleBooking(status: BookingStatus.awaitingHost, paymentStatus: 'pending', paid: 0, code: null));

      expect(find.textContaining('n\'a pas encore confirmé'), findsOneWidget);
      expect(find.byKey(const Key('pay-submit')), findsNothing);
    });

    testWidgets('depuis le détail d\'une réservation à payer, Payer ouvre ce parcours', (tester) async {
      final container = await pumpApp(tester, auth: FakeAuthRepository(restored: traveler), bookings: FakeBookingRepository(bookings: [payable]), accommodations: FakeAccommodationRepository(accommodations: const [sampleListItem]));
      container.read(routerProvider).go('/bookings/1871');
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const Key('booking-pay')));
      await tester.pumpAndSettle();

      expect(find.text('Comment souhaitez-vous payer ?'), findsOneWidget);
    });
  });
}

class PaymentOptionsFixtures {
  static PaymentOptions fullOnly() => PaymentOptions.fromJson(const {'full_only': true, 'options': {'full': {'label': 'Paiement intégral', 'amount': 114000, 'discount_percent': 0}}});
}
