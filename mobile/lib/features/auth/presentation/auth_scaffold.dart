import 'package:flutter/material.dart';

import '../../../l10n/app_localizations.dart';

/// Coque commune des écrans d'authentification : barre de retour, défilement, marges de la charte.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.children, this.showBack = true});

  final List<Widget> children;
  final bool showBack;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      appBar: showBack
          ? AppBar(
              leading: IconButton(
                tooltip: l10n.authBack,
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () => Navigator.of(context).maybePop(),
              ),
            )
          : null,
      body: SafeArea(
        child: SingleChildScrollView(
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: children),
        ),
      ),
    );
  }
}

/// Bandeau d'erreur rouge pâle, commun aux formulaires d'authentification.
/// Alias public du bandeau d'erreur, utilisable hors de l'authentification (réservation…).
class AuthErrorBanner extends AuthError {
  const AuthErrorBanner(super.message, {super.key});
}

class AuthError extends StatelessWidget {
  const AuthError(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) => Container(
        key: const Key('auth-error'),
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: const Color(0xFFFFF1F1), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFFFCACA))),
        child: Text(message, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: const Color(0xFFCC0000))),
      );
}

/// Libellé placé au-dessus d'un champ (comme sur le site).
class FieldLabel extends StatelessWidget {
  const FieldLabel(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8, left: 4),
        child: Text(text, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
      );
}
