/// Numéro saisi sans indicatif (« 07 07 00 00 00 ») → « +2250707000000 » ; un numéro déjà international est conservé.
String internationalPhone(String input) {
  final raw = input.trim();
  final digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
  if (digits.isEmpty) return '';
  if (raw.startsWith('+')) return '+$digits';
  if (raw.startsWith('00')) return '+${digits.substring(2)}';

  return '+225$digits';
}

int phoneDigits(String input) => input.replaceAll(RegExp(r'[^0-9]'), '').length;
