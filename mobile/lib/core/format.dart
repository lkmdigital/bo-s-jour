import 'package:intl/intl.dart';

/// Prix en FCFA avec séparateur de milliers insécable (« 17 000 »).
String formatFcfa(num amount, String languageCode) {
  final text = NumberFormat.decimalPattern(languageCode == 'en' ? 'en' : 'fr').format(amount.round());

  return text.replaceAll(' ', ' ').replaceAll(' ', ' ');
}

String formatRating(double rating, String languageCode) => NumberFormat('0.0', languageCode == 'en' ? 'en' : 'fr').format(rating);
