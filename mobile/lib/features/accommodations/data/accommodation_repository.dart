import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/providers.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/accommodation.dart';
import '../domain/accommodation_detail.dart';

abstract class AccommodationRepository {
  Future<List<City>> topCities();

  /// Hébergements publiés, du plus recommandé au moins recommandé (la pagination arrive en phase 1).
  Future<List<Accommodation>> list({String? search, int perPage = 20});

  /// Fiche complète : photos, équipements, chambres, avis, garantie. Un établissement non publié répond 404.
  Future<AccommodationDetail> detail(int id);
}

class ApiAccommodationRepository implements AccommodationRepository {
  ApiAccommodationRepository(this._dio, this._l10n);

  final Dio _dio;
  final AppLocalizations _l10n;

  @override
  Future<List<City>> topCities() => guardApi(() async {
        final response = await _dio.get<Map<String, dynamic>>('/accommodations/top-cities');
        final cities = response.data?['cities'];

        return cities is List ? cities.whereType<Map<String, dynamic>>().map(City.fromJson).toList() : const <City>[];
      }, _l10n);

  @override
  Future<List<Accommodation>> list({String? search, int perPage = 20}) => guardApi(() async {
        final response = await _dio.get<Map<String, dynamic>>('/accommodations', queryParameters: {
          'per_page': perPage,
          if (search != null && search.trim().isNotEmpty) 'search': search.trim(),
        });
        final data = response.data?['data'];

        return data is List ? data.whereType<Map<String, dynamic>>().map(Accommodation.fromJson).toList() : const <Accommodation>[];
      }, _l10n);

  @override
  Future<AccommodationDetail> detail(int id) => guardApi(() async {
        final response = await _dio.get<Map<String, dynamic>>('/accommodations/$id');
        final body = response.data ?? const <String, dynamic>{};
        // La fiche arrive à plat ; on tolère aussi l'enveloppe { data: {…} }.
        final json = body['data'] is Map<String, dynamic> ? body['data'] as Map<String, dynamic> : body;

        return AccommodationDetail.fromJson(json, english: _l10n.localeName == 'en');
      }, _l10n);
}

final accommodationRepositoryProvider = Provider<AccommodationRepository>((ref) => ApiAccommodationRepository(ref.watch(dioProvider), ref.watch(l10nProvider)));

final topCitiesProvider = FutureProvider<List<City>>((ref) => ref.watch(accommodationRepositoryProvider).topCities());

final featuredAccommodationsProvider = FutureProvider<List<Accommodation>>((ref) => ref.watch(accommodationRepositoryProvider).list(perPage: 8));

/// Résultats pour un texte de recherche (une entrée par texte : revenir à une recherche déjà faite est instantané).
final searchResultsProvider = FutureProvider.family<List<Accommodation>, String>((ref, query) => ref.watch(accommodationRepositoryProvider).list(search: query));

/// Une fiche par établissement : revenir sur une fiche déjà vue est instantané.
final accommodationDetailProvider = FutureProvider.family<AccommodationDetail, int>((ref, id) => ref.watch(accommodationRepositoryProvider).detail(id));
