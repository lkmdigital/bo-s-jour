import '../l10n/app_localizations.dart';
import 'network/api_exception.dart';

/// Message à afficher pour une erreur quelconque (celles de l'API ont déjà un texte prêt).
String errorText(Object error, AppLocalizations l10n) => error is ApiException ? error.message : l10n.errorGeneric;
