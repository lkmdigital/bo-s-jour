import 'package:bosejour/core/format.dart';
import 'dart:convert';
import 'dart:io';

import 'package:bosejour/features/accommodations/domain/accommodation.dart';
import 'package:bosejour/features/accommodations/domain/accommodation_detail.dart';
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

  group('Fiche établissement', () {
    Map<String, dynamic> fixture() => jsonDecode(File('test/fixtures/accommodation_detail.json').readAsStringSync()) as Map<String, dynamic>;

    test('lit une vraie réponse de l\'API : infos, photos, chambres, garantie, avis', () {
      final a = AccommodationDetail.fromJson(fixture());

      expect(a.name, 'LE RANCH HOTEL SAN PEDRO');
      expect(a.city, 'SAN PEDRO');
      expect(a.starRating, 2);
      expect(a.pricePerNight, 65000);
      expect(a.maxGuests, 28);
      expect(a.checkIn, '15:00', reason: '« 15:00:00 » est raccourci');
      expect(a.checkOut, '12:00');
      expect(a.cancellationHours, 48);
      expect(a.amenities, containsAll(['Wi-Fi', 'Piscine', 'Climatisation']));
      expect(a.services, containsAll([HotelService.reception24h, HotelService.shuttle, HotelService.breakfastIncluded]));
      expect(a.services, isNot(contains(HotelService.laundry)));
      expect(a.hasLocation, isTrue);
      expect(a.images, isNotEmpty);
      expect(a.images.every((u) => u.startsWith('https://')), isTrue);
      expect(a.guarantee?.label, 'Garantie de réservation');
      expect(a.guarantee?.description, contains('1re nuit'));
      expect(a.rooms, isNotEmpty);
      expect(a.rooms.first.name, 'CHAMBRE DOUBLE');
      expect(a.rooms.first.pricePerNight, 65000);
      expect(a.rooms.first.amenities, contains('Wi-Fi'));
      expect(a.reviewCount, 1);
      expect(a.rating, 4.5);
      expect(a.reviews.single.author, 'Awa Koné');
      expect(a.reviews.single.reply, contains('Merci Awa'));
    });

    test('la photo principale passe en premier, puis l\'ordre choisi par l\'établissement', () {
      final json = fixture()
        ..['images'] = [
          {'url': 'https://x/3.jpg', 'is_primary': false, 'order': 3},
          {'url': 'https://x/1.jpg', 'is_primary': false, 'order': 1},
          {'url': '/storage/accommodations/9/main.jpg', 'is_primary': true, 'order': 5},
        ];

      expect(AccommodationDetail.fromJson(json).images, ['https://api.bosejour.ci/storage/accommodations/9/main.jpg', 'https://x/1.jpg', 'https://x/3.jpg']);
    });

    test('sans avis : aucune note affichée, même si le serveur envoie « 0.00 »', () {
      final json = fixture()
        ..['rating'] = '0.00'
        ..['total_reviews'] = 0
        ..['reviews'] = <Object>[];
      final a = AccommodationDetail.fromJson(json);

      expect(a.rating, isNull);
      expect(a.reviews, isEmpty);
    });

    test('la garantie désactivée n\'est pas affichée ; une position 0,0 n\'ouvre pas la carte', () {
      final json = fixture()
        ..['guarantee'] = {'enabled': false, 'label': 'Garantie de réservation'}
        ..['latitude'] = '0.00000000'
        ..['longitude'] = '0.00000000';
      final a = AccommodationDetail.fromJson(json);

      expect(a.guarantee, isNull);
      expect(a.hasLocation, isFalse);
    });

    test('une chambre inactive est masquée ; la description anglaise est préférée en anglais, avec repli sur le français', () {
      final json = fixture();
      (json['rooms'] as List).first['is_active'] = false;
      final fr = AccommodationDetail.fromJson(json);
      expect(fr.rooms.where((r) => r.name == 'CHAMBRE DOUBLE'), isEmpty);

      json['description_en'] = 'A quiet place by the sea.';
      expect(AccommodationDetail.fromJson(json, english: true).description, 'A quiet place by the sea.');
      expect(AccommodationDetail.fromJson(json).description, isNot('A quiet place by the sea.'));

      json['description_en'] = null;
      expect(AccommodationDetail.fromJson(json, english: true).description, fr.description, reason: 'pas de traduction : le français plutôt que rien');
    });

    test('données incomplètes : aucune exception', () {
      final a = AccommodationDetail.fromJson({'id': 5});

      expect(a.name, '');
      expect(a.images, isEmpty);
      expect(a.rooms, isEmpty);
      expect(a.reviews, isEmpty);
      expect(a.guarantee, isNull);
      expect(a.pricePerNight, 0);
    });
  });
}
