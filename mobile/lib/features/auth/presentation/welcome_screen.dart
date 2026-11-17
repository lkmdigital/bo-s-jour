import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/confetti.dart';
import 'auth_args.dart';
import 'auth_controller.dart';

/// Écran de bienvenue juste après la création du compte : confettis, et rappel de l'invitation appliquée.
class WelcomeScreen extends ConsumerWidget {
  const WelcomeScreen({super.key, required this.args});

  final WelcomeArgs args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final user = ref.watch(authControllerProvider).value;
    final first = (user?.name ?? '').split(' ').first;
    final referral = args.referral;

    return Scaffold(
      body: Stack(children: [
        const Positioned.fill(child: Confetti()),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Spacer(flex: 2),
              Center(
                child: TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0, end: 1),
                  duration: const Duration(milliseconds: 700),
                  curve: Curves.elasticOut,
                  builder: (_, v, child) => Transform.scale(scale: v, child: child),
                  child: Container(width: 104, height: 104, decoration: const BoxDecoration(color: Color(0xFFDFF3EA), shape: BoxShape.circle), child: const Icon(Icons.check_rounded, size: 56, color: Color(0xFF0E7A4B))),
                ),
              ),
              const SizedBox(height: 26),
              Text(l10n.welcomeTitle(first), key: const Key('welcome-title'), textAlign: TextAlign.center, style: theme.textTheme.headlineMedium),
              const SizedBox(height: 8),
              Text(l10n.welcomeSubtitle, textAlign: TextAlign.center, style: theme.textTheme.bodyLarge?.copyWith(color: Brand.textMuted)),
              if (referral != null) ...[
                const SizedBox(height: 24),
                Container(
                  key: const Key('welcome-discount'),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: Brand.beige, borderRadius: BorderRadius.circular(20)),
                  child: Row(children: [
                    const CircleAvatar(backgroundColor: Brand.red, child: Icon(Icons.card_giftcard_rounded, color: Colors.white)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(l10n.welcomeDiscount('${referral.discountPercent ?? 5}'), style: theme.textTheme.titleMedium),
                        Text(l10n.welcomeDiscountSub, style: theme.textTheme.bodySmall?.copyWith(color: Brand.grayDark)),
                      ]),
                    ),
                  ]),
                ),
              ],
              const Spacer(flex: 3),
              FilledButton(key: const Key('welcome-cta'), onPressed: () => context.go('/'), child: Text(l10n.welcomeCta)),
            ]),
          ),
        ),
      ]),
    );
  }
}
