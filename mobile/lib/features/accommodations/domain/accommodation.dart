import '../../../core/config/app_config.dart';

/// Hébergement tel qu'il apparaît dans les listes (réponse de GET /accommodations).
class Accommodation {
  const Accommodation({
    required this.id,
    required this.name,
    required this.city,
    required this.type,
    required this.pricePerNight,
    required this.reviews,
    this.rating,
    this.imageUrl,
  });

  final int id;
  final String name;
  final String city;
  final String type; // hotel | lodge | guesthouse | apartment | other
  final num pricePerNight; // tarif effectif (promotions comprises)
  final double? rating; // null tant qu'il n'y a aucun avis
  final int reviews;
  final String? imageUrl;

  factory Accommodation.fromJson(Map<String, dynamic> json) {
    final reviews = (json['total_reviews'] as num?)?.toInt() ?? 0;
    final rating = _toDouble(json['rating']);

    return Accommodation(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String? ?? '',
      city: json['city'] as String? ?? '',
      type: json['type'] as String? ?? 'other',
      pricePerNight: _toNum(json['effective_price_per_night']) ?? _toNum(json['price_per_night']) ?? 0,
      reviews: reviews,
      rating: reviews > 0 && rating != null && rating > 0 ? rating : null,
      imageUrl: _primaryImage(json['images']),
    );
  }

  static String? _primaryImage(Object? images) {
    if (images is! List || images.isEmpty) return null;
    final list = images.whereType<Map>().toList();
    if (list.isEmpty) return null;
    final primary = list.firstWhere((i) => i['is_primary'] == true || i['is_primary'] == 1, orElse: () => list.first);

    return resolveImageUrl(primary['url'] as String?);
  }
}

/// Ville populaire (réponse de GET /accommodations/top-cities).
class City {
  const City({required this.name, required this.count, required this.fromPrice, this.imageUrl});

  final String name;
  final int count;
  final num fromPrice;
  final String? imageUrl;

  factory City.fromJson(Map<String, dynamic> json) => City(
        name: json['city'] as String? ?? '',
        count: (json['accommodations_count'] as num?)?.toInt() ?? 0,
        fromPrice: _toNum(json['from_price']) ?? 0,
        imageUrl: resolveImageUrl(json['image'] as String?),
      );
}

/// Les images arrivent tantôt en adresse complète, tantôt en chemin relatif (« /storage/… »).
String? resolveImageUrl(String? url) {
  if (url == null || url.isEmpty) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  return '${AppConfig.apiOrigin}${url.startsWith('/') ? '' : '/'}$url';
}

num? _toNum(Object? value) {
  if (value is num) return value;
  if (value is String) return num.tryParse(value);

  return null;
}

double? _toDouble(Object? value) => _toNum(value)?.toDouble();
