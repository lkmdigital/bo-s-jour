import 'dart:convert';

import 'package:bosejour/app.dart';
import 'package:bosejour/core/network/providers.dart';
import 'package:bosejour/core/storage/token_storage.dart';
import 'package:bosejour/features/accommodations/data/accommodation_repository.dart';
import 'package:bosejour/features/accommodations/domain/accommodation.dart';
import 'package:bosejour/features/auth/data/auth_repository.dart';
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
  FakeAuthRepository({this.restored, this.loginResult, this.loginError});

  User? restored;
  LoginResult? loginResult;
  Object? loginError;
  int logouts = 0;
  final List<(String, String)> logins = [];

  @override
  Future<User?> restore() async => restored;

  @override
  Future<LoginResult> login(String email, String password) async {
    logins.add((email, password));
    if (loginError != null) throw loginError!;

    return loginResult ?? LoginSuccess(traveler);
  }

  @override
  Future<void> logout() async => logouts++;
}

class FakeAccommodationRepository implements AccommodationRepository {
  FakeAccommodationRepository({this.cities = const [], this.accommodations = const [], this.error});

  final List<City> cities;
  final List<Accommodation> accommodations;
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
  Size size = const Size(390, 844),
}) async {
  await loadBrandFonts();
  tester.view.physicalSize = size * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);

  final container = ProviderContainer(retry: (_, _) => null, overrides: [
    authRepositoryProvider.overrideWithValue(auth ?? FakeAuthRepository()),
    accommodationRepositoryProvider.overrideWithValue(accommodations ?? FakeAccommodationRepository(cities: sampleCities, accommodations: sampleAccommodations)),
    tokenStorageProvider.overrideWithValue(MemoryTokenStorage()),
    localeProvider.overrideWithValue(const Locale('fr')),
    appVersionProvider.overrideWithValue('1.0.0+1'),
  ]);
  addTearDown(container.dispose);

  await tester.pumpWidget(UncontrolledProviderScope(container: container, child: const BoSejourApp()));
  await tester.pumpAndSettle();

  return container;
}
