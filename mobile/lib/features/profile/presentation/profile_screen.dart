import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/app_config.dart';
import '../../../core/network/providers.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../auth/domain/user.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../auth/presentation/login_form.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    return SafeArea(
      child: auth.when(
        data: (user) => user == null
            ? SingleChildScrollView(padding: const EdgeInsets.fromLTRB(24, 16, 24, 32), child: const LoginForm())
            : _Account(user: user),
        loading: () => const Center(child: CircularProgressIndicator(color: Brand.red)),
        // L'état « erreur » n'existe pas ici (le chargement de session ne lève pas) ; repli sûr : formulaire de connexion.
        error: (_, _) => SingleChildScrollView(padding: const EdgeInsets.fromLTRB(24, 16, 24, 32), child: const LoginForm()),
      ),
    );
  }
}

class _Account extends ConsumerWidget {
  const _Account({required this.user});

  final User user;

  String _role(AppLocalizations l10n) => user.isAdmin ? l10n.roleAdmin : (user.isHost ? l10n.roleHost : l10n.roleTraveler);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final version = ref.watch(appVersionProvider);
    Future<void> open(String path) => launchUrl(AppConfig.sitePage(path), mode: LaunchMode.externalApplication);

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      children: [
        Text(l10n.accountTitle, style: theme.textTheme.headlineMedium),
        const SizedBox(height: 20),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Row(children: [
              CircleAvatar(radius: 28, backgroundColor: Brand.red, child: Text(user.name.isEmpty ? '?' : user.name.characters.first.toUpperCase(), style: const TextStyle(fontFamily: Brand.fontText, fontWeight: FontWeight.w700, fontSize: 22, color: Colors.white))),
              const SizedBox(width: 16),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(user.name, style: theme.textTheme.titleMedium, maxLines: 1, overflow: TextOverflow.ellipsis),
                  Text(user.email, style: theme.textTheme.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(20)),
                    child: Text(_role(l10n), style: theme.textTheme.bodySmall?.copyWith(color: Brand.black, fontWeight: FontWeight.w700)),
                  ),
                ]),
              ),
            ]),
          ),
        ),
        const SizedBox(height: 16),
        Card(
          child: Column(children: [
            _Tile(icon: Icons.help_outline_rounded, label: l10n.accountHelp, onTap: () => open('/aide')),
            const Divider(),
            _Tile(icon: Icons.description_outlined, label: l10n.accountTerms, onTap: () => open('/conditions-generales')),
            const Divider(),
            _Tile(icon: Icons.privacy_tip_outlined, label: l10n.accountPrivacy, onTap: () => open('/politique-de-confidentialite')),
          ]),
        ),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          key: const Key('logout'),
          icon: const Icon(Icons.logout_rounded),
          label: Text(l10n.accountLogout),
          onPressed: () => ref.read(authControllerProvider.notifier).logout(),
        ),
        const SizedBox(height: 18),
        Center(child: Text(l10n.accountVersion(version), style: theme.textTheme.bodySmall)),
      ],
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => ListTile(
        leading: Icon(icon, color: Brand.grayGreen),
        title: Text(label, style: Theme.of(context).textTheme.bodyLarge),
        trailing: const Icon(Icons.chevron_right_rounded, color: Brand.textMuted),
        onTap: onTap,
      );
}
