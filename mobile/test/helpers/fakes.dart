import 'dart:convert';
import 'dart:io';

import 'package:bosejour/app.dart';
import 'package:bosejour/core/network/providers.dart';
import 'package:bosejour/core/storage/token_storage.dart';
import 'package:bosejour/features/accommodations/data/accommodation_repository.dart';
import 'package:bosejour/core/network/api_exception.dart';
import 'package:bosejour/features/accommodations/domain/accommodation.dart';
import 'package:bosejour/features/accommodations/domain/accommodation_detail.dart';
import 'package:bosejour/features/assistant/data/assistant_repository.dart';
import 'package:bosejour/features/assistant/domain/bo_models.dart';
import 'package:bosejour/features/auth/data/auth_repository.dart';
import 'package:bosejour/features/bookings/data/booking_repository.dart';
import 'package:bosejour/features/bookings/domain/booking.dart';
import 'package:bosejour/features/bookings/domain/booking_request.dart';
import 'package:bosejour/features/bookings/domain/price_quote.dart';
import 'package:bosejour/features/auth/domain/user.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Faux serveur : répond selon « MÉTHODE /chemin » sans aucun réseau.
class FakeAdapter implements HttpClientAdapter {
  FakeAdapter(this.routes);

  /// « POST /login » → (code HTTP, corps JSON). Une exception lancée simule une panne réseau.
  final Map<String, (int, Object?) Function(RequestOptions)> routes;
  final List<RequestOptions> requests = [];

  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    requests.add(options);
    final handler = routes['${options.method} ${options.path}'];
    if (handler == null) return ResponseBody.fromString(jsonEncode({'message': 'introuvable'}), 404, headers: _json);
    final (status, body) = handler(options);

    return ResponseBody.fromString(jsonEncode(body), status, headers: _json);
  }

  static const _json = {Headers.contentTypeHeader: ['application/json']};

  @override
  void close({bool force = false}) {}
}

(int, Object?) Function(RequestOptions) ok(Object? body) => (_) => (200, body);
(int, Object?) Function(RequestOptions) status(int code, Object? body) => (_) => (code, body);
(int, Object?) Function(RequestOptions) offline() => (o) => throw DioException(requestOptions: o, type: DioExceptionType.connectionError);

class FakeAuthRepository implements AuthRepository {
  FakeAuthRepository({this.restored, this.loginResult, this.loginError, this.registerError, this.otpError, this.referral = const ReferralInfo(valid: false)});

  User? restored;
  LoginResult? loginResult;
  Object? loginError;
  Object? registerError;
  Object? otpError;
  Object? twoFactorError;
  ReferralInfo referral;
  int logouts = 0;
  final List<(String, String)> logins = [];
  final List<RegisterRequest> registrations = [];
  final List<(int, String)> otpAttempts = [];
  final List<String> resends = [];
  final List<String> forgotten = [];
  final List<(String, String?, String?)> twoFactorAttempts = [];
  final List<String> referralLookups = [];

  @override
  Future<User?> restore() async => restored;

  @override
  Future<LoginResult> login(String email, String password) async {
    logins.add((email, password));
    if (loginError != null) throw loginError!;

    return loginResult ?? LoginSuccess(traveler);
  }

  @override
  Future<PendingVerification> register(RegisterRequest request) async {
    registrations.add(request);
    if (registerError != null) throw registerError!;

    return PendingVerification(userId: 42, email: request.email.trim());
  }

  @override
  Future<User> verifyOtp(int userId, String code) async {
    otpAttempts.add((userId, code));
    if (otpError != null) throw otpError!;

    return traveler;
  }

  @override
  Future<void> resendOtp(String email) async => resends.add(email);

  @override
  Future<User> completeTwoFactor(String tempToken, {String? code, String? recoveryCode}) async {
    twoFactorAttempts.add((tempToken, code, recoveryCode));
    if (twoFactorError != null) throw twoFactorError!;

    return traveler;
  }

  @override
  Future<void> forgotPassword(String email) async => forgotten.add(email);

  @override
  Future<ReferralInfo> resolveReferral(String code) async {
    referralLookups.add(code);

    return referral;
  }

  @override
  Future<void> logout() async => logouts++;
}

/// Faux assistant : Bo éteint par défaut (comme tant que l'administrateur n'a pas activé le module IA).
class FakeAssistantRepository implements AssistantRepository {
  FakeAssistantRepository({this.settingsValue = const AiSettings(), this.answers = const [], this.error, this.delay = Duration.zero});

  /// Temps de réflexion simulé (pour voir les trois points).
  final Duration delay;

  AiSettings settingsValue;
  final List<BoAnswer> answers;
  Object? error;
  final List<(String, List<({String role, String content})>)> asked = [];

  @override
  Future<AiSettings> settings() async => settingsValue;

  @override
  Future<BoAnswer> ask(String question, List<({String role, String content})> history) async {
    asked.add((question, history));
    if (delay > Duration.zero) await Future<void>.delayed(delay);
    if (error != null) throw error!;

    return answers[(asked.length - 1).clamp(0, answers.length - 1)];
  }
}

class FakeAccommodationRepository implements AccommodationRepository {
  FakeAccommodationRepository({this.cities = const [], this.accommodations = const [], this.details = const {}, this.error});

  final List<City> cities;
  final List<Accommodation> accommodations;

  /// Fiches complètes par identifiant ; une fiche absente répond 404, comme le serveur pour un établissement non publié.
  final Map<int, AccommodationDetail> details;
  Object? error;
  final List<String?> searches = [];

  @override
  Future<List<City>> topCities() async {
    if (error != null) throw error!;

    return cities;
  }

  @override
  Future<List<Accommodation>> list({String? search, int perPage = 20}) async {
    searches.add(search);
    if (error != null) throw error!;
    final q = (search ?? '').toLowerCase();

    return accommodations.where((a) => q.isEmpty || a.name.toLowerCase().contains(q) || a.city.toLowerCase().contains(q)).toList();
  }

  final List<int> detailRequests = [];

  @override
  Future<AccommodationDetail> detail(int id) async {
    detailRequests.add(id);
    if (error != null) throw error!;

    return details[id] ?? (throw ApiException(ApiErrorKind.rejected, 'No query results for model [App\\Models\\Accommodation] $id', statusCode: 404));
  }
}

const traveler = User(id: 1, name: 'Awa Koné', email: 'awa@example.com', role: 'user');

const sampleCities = [
  City(name: 'Korhogo', count: 11, fromPrice: 10000),
  City(name: 'Abidjan', count: 2, fromPrice: 50000),
];

const sampleAccommodations = [
  Accommodation(id: 16, name: 'Hôtel yatchenin vallon', city: 'Abidjan', type: 'hotel', pricePerNight: 57000, reviews: 0),
  Accommodation(id: 1, name: 'Hôtel Ivoire Premium', city: 'Abidjan', type: 'hotel', pricePerNight: 33000, reviews: 2, rating: 4.5),
  Accommodation(id: 7, name: 'Villa Asili', city: 'Grand-Bassam', type: 'guesthouse', pricePerNight: 50000, reviews: 0),
];

/// Réponse réelle de l'API (test/fixtures), sans photos : les tests n'ont pas de réseau.
Map<String, dynamic> sampleDetailJson() {
  final json = jsonDecode(File('test/fixtures/accommodation_detail.json').readAsStringSync()) as Map<String, dynamic>;
  json['images'] = <Object>[];
  for (final room in json['rooms'] as List) {
    (room as Map<String, dynamic>)['images'] = <Object>[];
    room['primary_image'] = null;
  }

  return json;
}

AccommodationDetail sampleDetail({bool english = false}) => AccommodationDetail.fromJson(sampleDetailJson(), english: english);

const sampleListItem = Accommodation(id: 37, name: 'LE RANCH HOTEL SAN PEDRO', city: 'SAN PEDRO', type: 'hotel', pricePerNight: 65000, reviews: 1, rating: 4.5);

bool _fontsLoaded = false;

/// Charge les vraies polices de la marque : sans cela, les tests utilisent une police carrée bien plus large
/// (faux débordements) et les captures d'écran de test seraient illisibles.
Future<void> loadBrandFonts() async {
  if (_fontsLoaded) return;
  const families = {
    'DMSans': ['assets/fonts/DMSans-400.ttf', 'assets/fonts/DMSans-500.ttf', 'assets/fonts/DMSans-700.ttf'],
    'Baloo2': ['assets/fonts/Baloo2-700.ttf'],
    'DancingScript': ['assets/fonts/DancingScript-600.ttf'],
  };
  for (final entry in families.entries) {
    final loader = FontLoader(entry.key);
    for (final path in entry.value) {
      loader.addFont(rootBundle.load(path));
    }
    await loader.load();
  }
  _fontsLoaded = true;
}

/// Lance l'appli complète avec de faux dépôts de données.
Future<ProviderContainer> pumpApp(
  WidgetTester tester, {
  FakeAuthRepository? auth,
  FakeAccommodationRepository? accommodations,
  FakeAssistantRepository? assistant,
  FakeBookingRepository? bookings,
  Size size = const Size(390, 844),
}) async {
  await loadBrandFonts();
  tester.view.physicalSize = size * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);

  final container = ProviderContainer(retry: (_, _) => null, overrides: [
    authRepositoryProvider.overrideWithValue(auth ?? FakeAuthRepository()),
    accommodationRepositoryProvider.overrideWithValue(accommodations ?? FakeAccommodationRepository(cities: sampleCities, accommodations: sampleAccommodations)),
    assistantRepositoryProvider.overrideWithValue(assistant ?? FakeAssistantRepository()),
    bookingRepositoryProvider.overrideWithValue(bookings ?? FakeBookingRepository()),
    tokenStorageProvider.overrideWithValue(MemoryTokenStorage()),
    localeProvider.overrideWithValue(const Locale('fr')),
    appVersionProvider.overrideWithValue('1.0.0+1'),
  ]);
  addTearDown(container.dispose);

  await tester.pumpWidget(UncontrolledProviderScope(container: container, child: const BoSejourApp()));
  // Bo allumé : son orbe cligne en continu, `pumpAndSettle` ne s'arrêterait jamais.
  if (assistant?.settingsValue.enabled == true) {
    await tester.pump(const Duration(milliseconds: 400));
  } else {
    await tester.pumpAndSettle();
  }

  return container;
}

/// Faux service de réservation : aucune demande ne part vraiment (en production, une demande prévient l'hôte par e-mail, SMS et WhatsApp).
class FakeBookingRepository implements BookingRepository {
  FakeBookingRepository({this.quoteResult, this.createError, this.quoteError, this.bookings = const [], this.cancelError, this.cancelResult = const CancelResult()});

  final List<Booking> bookings;
  Object? cancelError;
  CancelResult cancelResult;
  final List<(int, String)> cancellations = [];

  PriceQuote? quoteResult;
  Object? quoteError;
  Object? createError;
  final List<QuoteParams> quotes = [];
  final List<BookingRequest> created = [];

  @override
  Future<PriceQuote> quote(QuoteParams params) async {
    quotes.add(params);
    if (quoteError != null) throw quoteError!;

    return quoteResult ?? sampleQuote;
  }

  @override
  Future<List<Booking>> mine() async => bookings;

  @override
  Future<Booking> detail(int id) async => bookings.firstWhere((b) => b.id == id);

  @override
  Future<CancelResult> cancel(int id, String reason) async {
    cancellations.add((id, reason));
    if (cancelError != null) throw cancelError!;

    return cancelResult;
  }

  @override
  Future<CreatedBooking> create(BookingRequest request) async {
    created.add(request);
    if (createError != null) throw createError!;

    return const CreatedBooking(id: 1871, status: 'awaiting_host_confirmation', accessToken: 'tok', accommodationName: 'Hôtel');
  }
}

/// Réservation d'exemple : séjour dans 20 jours, confirmée et payée en intégral.
Booking sampleBooking({int id = 1871, BookingStatus status = BookingStatus.confirmed, int daysAhead = 20, String? paymentStatus = 'paid', num total = 108300, num? paid = 108300, String? code = 'BS-4Q7K', String name = 'Hôtel Les Cocotiers', int nights = 2, bool nonRefundable = false, int? hours = 48, String type = 'full'}) {
  final from = DateTime.now().add(Duration(days: daysAhead));
  final checkIn = DateTime(from.year, from.month, from.day);

  return Booking(
    id: id, status: status, checkIn: checkIn, checkOut: checkIn.add(Duration(days: nights)), guests: 2, totalPrice: total, accommodationName: name, city: 'Grand-Bassam',
    paymentStatus: paymentStatus, paymentType: type, amountPaid: paid, confirmationCode: code, bookingNumber: 'BS-$id', accessToken: 'tok-$id',
    isNonRefundable: nonRefundable, cancellationHours: hours,
  );
}

/// Devis réel (hôtel 16, deux nuits) : paiement intégral à −5 %, garantie = 1re nuit.
final sampleQuote = PriceQuote.fromJson(const {
  'effective_price_per_night': 57000,
  'nights': 2,
  'total': 114000,
  'extra_breakfast_total': 0,
  'cancellation_policy_hours': 48,
  'long_stay_discount': null,
  'referral_discount': null,
  'payment_options': {
    'full_only': false,
    'options': {
      'full': {'label': 'Paiement intégral', 'amount': 108300, 'original_amount': 114000, 'discount_percent': 5},
      'guarantee': {'label': 'Garantie de réservation', 'amount': 57000, 'summary': '1re nuit', 'balance_at_hotel': 57000},
    },
  },
});
