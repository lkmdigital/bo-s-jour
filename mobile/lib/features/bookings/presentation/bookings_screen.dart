import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/app_config.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../auth/presentation/auth_controller.dart';

/// Phase 0 : écran d'accueil de la rubrique. La liste des réservations arrive en phase 1.
class BookingsScreen extends ConsumerWidget {
  const BookingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final loggedIn = ref.watch(authControllerProvider).value != null;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(l10n.bookingsTitle, style: theme.textTheme.headlineMedium),
            Expanded(
              child: Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.calendar_month_rounded, size: 54, color: Brand.grayGreen),
                  const SizedBox(height: 16),
                  Text(loggedIn ? l10n.bookingsComingSoon : l10n.bookingsLoginPrompt, textAlign: TextAlign.center, style: theme.textTheme.bodyLarge),
                  const SizedBox(height: 22),
                  if (loggedIn)
                    OutlinedButton(
                      onPressed: () => launchUrl(AppConfig.sitePage('/dashboard/user/reservations'), mode: LaunchMode.externalApplication),
                      style: OutlinedButton.styleFrom(minimumSize: const Size(220, 50)),
                      child: Text(l10n.bookingsOpenSite),
                    )
                  else
                    FilledButton(onPressed: () => context.go('/account'), style: FilledButton.styleFrom(minimumSize: const Size(220, 50)), child: Text(l10n.loginSubmit)),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
