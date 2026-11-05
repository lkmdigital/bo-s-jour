import '../../../core/json.dart';
import 'accommodation.dart';

/// Garantie de réservation, telle que l'établissement l'a paramétrée : le serveur fournit les textes tout prêts,
/// l'appli ne calcule ni ne reformule rien (ce qui est annoncé doit être ce qui sera prélevé).
class GuaranteeInfo {
  const GuaranteeInfo({required this.label, this.summary, this.description});

  final String label;
  final String? summary;
  final String? description;

  static GuaranteeInfo? fromJson(Object? json) {
    if (json is! Map || !toBool(json['enabled'])) return null;
    final label = toText(json['label']);
    if (label == null) return null;

    return GuaranteeInfo(label: label, summary: toText(json['summary']), description: toText(json['description']));
  }
}

class RoomInfo {
  const RoomInfo({required this.id, required this.name, required this.pricePerNight, required this.amenities, this.capacity, this.description, this.imageUrl});

  final int id;
  final String name;
  final int? capacity;
  final num pricePerNight; // tarif effectif (promotions comprises)
  final String? description;
  final String? imageUrl;
  final List<String> amenities;

  factory RoomInfo.fromJson(Map<String, dynamic> json, {required bool english}) {
    final images = json['images'];
    String? image = resolveImageUrl(toText(json['primary_image'] is Map ? (json['primary_image'] as Map)['full_url'] : null));
    if (image == null && images is List) {
      final list = images.whereType<Map>().toList();
      final primary = list.where((i) => toBool(i['is_primary'])).firstOrNull ?? list.firstOrNull;
      image = resolveImageUrl(toText(primary?['full_url']) ?? toText(primary?['image_path']));
    }

    return RoomInfo(
      id: toInt(json['id']) ?? 0,
      name: (english ? toText(json['name_en']) : null) ?? toText(json['name']) ?? '',
      capacity: toInt(json['capacity']),
      pricePerNight: toNum(json['effective_price_per_night']) ?? toNum(json['price_per_night']) ?? 0,
      description: (english ? toText(json['description_en']) : null) ?? toText(json['description']),
      imageUrl: image,
      amenities: toTextList(json['amenities']),
    );
  }
}

class ReviewInfo {
  const ReviewInfo({required this.author, required this.rating, this.comment, this.createdAt, this.reply});

  final String author; // jamais plus que le nom : le serveur ne renvoie aucune coordonnée d'un voyageur
  final double rating;
  final String? comment;
  final DateTime? createdAt;
  final String? reply; // réponse de l'établissement

  factory ReviewInfo.fromJson(Map<String, dynamic> json) {
    final user = json['user'];

    return ReviewInfo(
      author: toText(user is Map ? user['name'] : null) ?? '',
      rating: toDouble(json['rating']) ?? 0,
      comment: toText(json['comment']),
      createdAt: DateTime.tryParse(json['created_at'] as String? ?? ''),
      reply: toText(json['admin_reply']),
    );
  }
}

/// Fiche complète d'un hébergement (réponse de GET /accommodations/{id}).
class AccommodationDetail {
  const AccommodationDetail({
    required this.id,
    required this.name,
    required this.city,
    required this.type,
    required this.pricePerNight,
    required this.reviewCount,
    required this.images,
    required this.amenities,
    required this.services,
    required this.rooms,
    required this.reviews,
    this.address,
    this.starRating,
    this.rating,
    this.description,
    this.maxGuests,
    this.bedrooms,
    this.bathrooms,
    this.checkIn,
    this.checkOut,
    this.cancellationHours,
    this.specialConditions,
    this.guarantee,
    this.latitude,
    this.longitude,
  });

  final int id;
  final String name;
  final String city;
  final String? address;
  final String type;
  final int? starRating;
  final num pricePerNight;
  final double? rating; // null tant qu'il n'y a aucun avis
  final int reviewCount;
  final String? description;
  final List<String> images;
  final List<String> amenities;
  final Set<HotelService> services;
  final int? maxGuests;
  final int? bedrooms;
  final int? bathrooms;
  final String? checkIn; // « 15:00 »
  final String? checkOut;
  final int? cancellationHours; // 0 = non remboursable
  final String? specialConditions;
  final GuaranteeInfo? guarantee;
  final double? latitude;
  final double? longitude;
  final List<RoomInfo> rooms;
  final List<ReviewInfo> reviews;

  bool get hasLocation => latitude != null && longitude != null;

  factory AccommodationDetail.fromJson(Map<String, dynamic> json, {bool english = false}) {
    final reviewCount = toInt(json['total_reviews']) ?? 0;
    final rating = toDouble(json['rating']);
    final rooms = json['rooms'];
    final reviews = json['reviews'];
    final lat = toDouble(json['latitude']);
    final lng = toDouble(json['longitude']);

    return AccommodationDetail(
      id: toInt(json['id']) ?? 0,
      name: toText(json['name']) ?? '',
      city: toText(json['city']) ?? '',
      address: toText(json['address']),
      type: toText(json['type']) ?? 'other',
      starRating: _stars(json['star_rating']),
      pricePerNight: toNum(json['effective_price_per_night']) ?? toNum(json['price_per_night']) ?? 0,
      rating: reviewCount > 0 && rating != null && rating > 0 ? rating : null,
      reviewCount: reviewCount,
      description: (english ? toText(json['description_en']) : null) ?? toText(json['description']),
      images: _images(json['images']),
      amenities: toTextList(json['amenities']),
      services: {
        if (toBool(json['reception_24h'])) HotelService.reception24h,
        if (toBool(json['shuttle_service'])) HotelService.shuttle,
        if (toBool(json['laundry'])) HotelService.laundry,
        if (toBool(json['pets_allowed'])) HotelService.pets,
        if (toBool(json['smoking_area'])) HotelService.smokingArea,
        if (toBool(json['breakfast_included'])) HotelService.breakfastIncluded,
      },
      maxGuests: toInt(json['max_guests']),
      bedrooms: toInt(json['bedrooms']),
      bathrooms: toInt(json['bathrooms']),
      checkIn: _hour(json['check_in_time']),
      checkOut: _hour(json['check_out_time']),
      cancellationHours: toInt(json['cancellation_policy_hours']),
      specialConditions: toText(json['special_conditions']),
      guarantee: GuaranteeInfo.fromJson(json['guarantee']),
      // 0,0 = « position non renseignée » : on ne propose pas d'ouvrir la carte sur l'océan Atlantique.
      latitude: lat != null && lng != null && !(lat == 0 && lng == 0) ? lat : null,
      longitude: lat != null && lng != null && !(lat == 0 && lng == 0) ? lng : null,
      rooms: rooms is List
          ? rooms.whereType<Map<String, dynamic>>().where((r) => r['is_active'] == null || toBool(r['is_active'])).map((r) => RoomInfo.fromJson(r, english: english)).toList()
          : const [],
      reviews: reviews is List ? reviews.whereType<Map<String, dynamic>>().map(ReviewInfo.fromJson).toList() : const [],
    );
  }

  /// Photo principale d'abord, puis l'ordre choisi par l'établissement.
  static List<String> _images(Object? images) {
    if (images is! List) return const [];
    final list = images.whereType<Map>().toList()
      ..sort((a, b) {
        final primary = (toBool(b['is_primary']) ? 1 : 0) - (toBool(a['is_primary']) ? 1 : 0);

        return primary != 0 ? primary : (toInt(a['order']) ?? 999).compareTo(toInt(b['order']) ?? 999);
      });

    return [for (final i in list) ?resolveImageUrl(toText(i['url']))];
  }

  static int? _stars(Object? value) {
    final n = toInt(value);

    return n != null && n >= 1 && n <= 5 ? n : null;
  }

  /// « 15:00:00 » → « 15:00 ».
  static String? _hour(Object? value) {
    final text = toText(value);
    if (text == null) return null;

    return text.length >= 5 ? text.substring(0, 5) : text;
  }
}

/// Services de l'établissement indiqués par oui/non (le reste des équipements est une liste libre).
enum HotelService { reception24h, shuttle, laundry, pets, smokingArea, breakfastIncluded }
