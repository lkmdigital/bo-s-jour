/// Lecture tolérante des réponses de l'API : Laravel renvoie tantôt un nombre, tantôt une chaîne (« 65000.00 »).
num? toNum(Object? value) {
  if (value is num) return value;
  if (value is String) return num.tryParse(value);

  return null;
}

double? toDouble(Object? value) => toNum(value)?.toDouble();

int? toInt(Object? value) => toNum(value)?.toInt();

/// Un booléen peut arriver en `true`, `1` ou `"1"`.
bool toBool(Object? value) => value == true || value == 1 || value == '1' || value == 'true';

String? toText(Object? value) {
  if (value is! String) return null;
  final text = value.trim();

  return text.isEmpty ? null : text;
}

List<String> toTextList(Object? value) => value is List ? value.whereType<String>().map((s) => s.trim()).where((s) => s.isNotEmpty).toList() : const [];
