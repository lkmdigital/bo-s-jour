/// Configuration de l'application. Les adresses se changent à la compilation, sans toucher au code :
/// `flutter run --dart-define=API_URL=http://10.0.2.2:8000/api` (émulateur Android vers l'API locale).
class AppConfig {
  const AppConfig._();

  static const String apiUrl = String.fromEnvironment('API_URL', defaultValue: 'https://api.bosejour.ci/api');
  static const String siteUrl = String.fromEnvironment('SITE_URL', defaultValue: 'https://bosejour.ci');

  /// Origine de l'API (https://api.bosejour.ci) : sert à compléter les adresses d'images relatives.
  static String get apiOrigin => Uri.parse(apiUrl).origin;

  /// Adresse d'une page du site (conditions, aide, mot de passe oublié…).
  static Uri sitePage(String path) => Uri.parse('$siteUrl$path');
}
