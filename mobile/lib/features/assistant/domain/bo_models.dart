import '../../../core/json.dart';
import '../../accommodations/domain/accommodation.dart';

/// Hébergement proposé par Bo (champ `offers` de la réponse de POST /assistant/ask).
class BoOffer {
  const BoOffer({required this.id, required this.name, required this.type, this.city, this.rating, this.photo, this.pricePerNight, this.total, this.nights, this.room});

  final int id;
  final String name;
  final String type;
  final String? city;
  final double? rating;
  final String? photo;
  final num? pricePerNight;
  final num? total;
  final int? nights;
  final String? room;

  factory BoOffer.fromJson(Map<String, dynamic> json) => BoOffer(
        id: (json['id'] as num).toInt(),
        name: json['name'] as String? ?? '',
        type: json['type'] as String? ?? 'other',
        city: toText(json['city']),
        rating: toDouble(json['rating']),
        photo: resolveImageUrl(toText(json['photo'])),
        pricePerNight: toNum(json['price_per_night_fcfa']),
        total: toNum(json['total_fcfa']),
        nights: toInt(json['nights']),
        room: toText(json['room']),
      );
}

/// Réponse de Bo : le texte et, à part, les hébergements trouvés (affichés en cartes).
class BoAnswer {
  const BoAnswer({required this.text, this.offers = const []});

  final String text;
  final List<BoOffer> offers;

  factory BoAnswer.fromJson(Map<String, dynamic> json) {
    final data = json['data'] is Map<String, dynamic> ? json['data'] as Map<String, dynamic> : json;
    final offers = data['offers'];

    return BoAnswer(
      text: data['answer'] as String? ?? '',
      offers: offers is List ? offers.whereType<Map<String, dynamic>>().map(BoOffer.fromJson).toList() : const [],
    );
  }
}

enum BoRole { user, assistant }

class BoMessage {
  const BoMessage({required this.role, required this.text, this.offers = const [], this.local = false, this.loginRequired = false});

  final BoRole role;
  final String text;
  final List<BoOffer> offers;

  /// Message d'erreur ou d'information : affiché, mais pas renvoyé au serveur comme historique.
  final bool local;
  final bool loginRequired;
}

/// Réglages publics qui concernent Bo : l'administrateur peut l'éteindre ou le fermer aux visiteurs non connectés.
class AiSettings {
  const AiSettings({this.enabled = false, this.guestsAllowed = false});

  final bool enabled;
  final bool guestsAllowed;

  factory AiSettings.fromJson(Map<String, dynamic> json) => AiSettings(enabled: toBool(json['ai_enabled']), guestsAllowed: toBool(json['ai_guest_enabled']));
}
