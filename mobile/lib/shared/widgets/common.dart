import 'package:flutter/material.dart';

import '../../core/theme/brand.dart';
import '../../l10n/app_localizations.dart';

/// Logo boséjour (version noire, pour fond clair).
class BoSejourLogo extends StatelessWidget {
  const BoSejourLogo({super.key, this.height = 38});

  final double height;

  @override
  Widget build(BuildContext context) => Image.asset('assets/images/logo-black.png', height: height, semanticLabel: AppLocalizations.of(context).appName);
}

/// Message d'erreur avec un bouton « Réessayer ». `compact` : version courte pour une petite zone (ex. la rangée des destinations).
class ErrorView extends StatelessWidget {
  const ErrorView({super.key, required this.message, required this.onRetry, this.compact = false});

  final String message;
  final VoidCallback onRetry;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final text = Text(message, textAlign: TextAlign.center, maxLines: compact ? 3 : null, overflow: compact ? TextOverflow.ellipsis : null, style: Theme.of(context).textTheme.bodyMedium);

    if (compact) {
      return Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          text,
          TextButton(onPressed: onRetry, child: Text(l10n.retry)),
        ]),
      );
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_rounded, size: 40, color: Brand.textMuted),
            const SizedBox(height: 12),
            text,
            const SizedBox(height: 16),
            OutlinedButton(onPressed: onRetry, style: OutlinedButton.styleFrom(minimumSize: const Size(160, 46)), child: Text(l10n.retry)),
          ],
        ),
      ),
    );
  }
}

/// Zone grise qui remplace un contenu en cours de chargement.
class Skeleton extends StatelessWidget {
  const Skeleton({super.key, this.width, required this.height, this.radius = 16});

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) => Container(
        width: width,
        height: height,
        decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(radius)),
      );
}
