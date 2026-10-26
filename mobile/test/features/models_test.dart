import 'package:bosejour/core/format.dart';
import 'package:bosejour/features/accommodations/domain/accommodation.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  // Réponses réelles de https://api.bosejour.ci/api (simplifiées).
  test('un hébergement sans avis est « nouveau » : pas de note affichée', () {
    final a = Accommodation.fromJson({
      'id': 32,
      'name': 'Complexe Hôtelier La Belle Rive',
      'type': 'hotel',
      'city': 'San pedro',
      'price_per_night': '17000.00',
      'effective_price_per_night': 17000,
      'rating': '0.00',
      'total_reviews': 0,
      'images': [
        {'id': 247, 'url': 'https://api.bosejour.ci/storage/accommodations/32/a.jpeg', 'is_primary': false, 'order': 1},
      ],
    });

    expect(a.rating, isNull);
    expect(a.pricePerNight, 17000);
    expect(a.imageUrl, 'https://api.bosejour.ci/storage/accommodations/32/a.jpeg');
  });

  test('la photo principale est préférée, une note n\'est gardée qu\'avec des avis', () {
    final a = Accommodation.fromJson({
      'id': 1,
      'name': 'Hôtel Ivoire Premium',
      'type': 'hotel',
      'city': 'Abidjan',
      'price_per_night': '35000.00',
      'effective_price_per_night': 33000, // promotion en cours
      'rating': '4.50',
      'total_reviews': 2,
      'images': [
        {'url': 'https://x/1.jpg', 'is_primary': false},
        {'url': '/storage/accommodations/1/main.jpg', 'is_primary': true},
      ],
    });

    expect(a.pricePerNight, 33000, reason: 'le tarif effectif (promotions comprises) l\'emporte');
    expect(a.rating, 4.5);
    expect(a.imageUrl, 'https://api.bosejour.ci/storage/accommodations/1/main.jpg', reason: 'chemin relatif complété par l\'adresse de l\'API');
  });

  test('données incomplètes : aucune exception, valeurs par défaut', () {
    final a = Accommodation.fromJson({'id': 5});

    expect(a.name, '');
    expect(a.type, 'other');
    expect(a.pricePerNight, 0);
    expect(a.imageUrl, isNull);
  });

  test('une ville populaire', () {
    final c = City.fromJson({'city': 'Korhogo', 'accommodations_count': 11, 'from_price': 10000, 'image': 'https://api.bosejour.ci/storage/a.jpg'});

    expect(c.name, 'Korhogo');
    expect(c.count, 11);
    expect(c.fromPrice, 10000);
  });

  test('prix et notes formatés à la française et à l\'anglaise', () {
    expect(formatFcfa(17000, 'fr'), '17 000');
    expect(formatFcfa(1250000, 'fr'), '1 250 000');
    expect(formatFcfa(17000, 'en'), '17,000');
    expect(formatRating(4.5, 'fr'), '4,5');
    expect(formatRating(4.5, 'en'), '4.5');
  });
}
