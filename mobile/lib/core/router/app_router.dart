import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/accommodations/presentation/accommodation_detail_screen.dart';
import '../../features/accommodations/presentation/explore_screen.dart';
import '../../features/accommodations/presentation/home_screen.dart';
import '../../features/assistant/presentation/bo_screen.dart';
import '../../features/auth/presentation/auth_args.dart';
import '../../features/auth/presentation/forgot_password_screen.dart';
import '../../features/auth/presentation/otp_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/auth/presentation/two_factor_screen.dart';
import '../../features/auth/presentation/welcome_screen.dart';
import '../../features/bookings/presentation/bookings_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../l10n/app_localizations.dart';

/// Les quatre onglets de l'appli. Chaque onglet garde son propre état quand on passe de l'un à l'autre.
final routerProvider = Provider<GoRouter>((ref) => GoRouter(
      initialLocation: '/',
      routes: [
        // Hors des onglets : la fiche couvre tout l'écran (barre de navigation comprise) et le retour ramène à l'onglet d'origine.
        GoRoute(path: '/accommodations/:id', builder: (_, state) => AccommodationDetailScreen(id: int.tryParse(state.pathParameters['id'] ?? '') ?? 0)),
        GoRoute(path: '/bo', builder: (_, _) => const BoScreen()),
        GoRoute(path: '/auth/register', builder: (_, state) => RegisterScreen(referral: state.uri.queryParameters['ref'])),
        // Les écrans suivants n'ont de sens qu'avec les données de l'étape précédente : sans elles (retour à froid), on revient au compte.
        GoRoute(path: '/auth/otp', redirect: (_, state) => state.extra is OtpArgs ? null : '/account', builder: (_, state) => OtpScreen(args: state.extra! as OtpArgs)),
        GoRoute(path: '/auth/2fa', redirect: (_, state) => state.extra is String ? null : '/account', builder: (_, state) => TwoFactorScreen(tempToken: state.extra! as String)),
        GoRoute(path: '/auth/forgot', builder: (_, _) => const ForgotPasswordScreen()),
        GoRoute(path: '/auth/welcome', builder: (_, state) => WelcomeScreen(args: state.extra is WelcomeArgs ? state.extra! as WelcomeArgs : const WelcomeArgs())),
        StatefulShellRoute.indexedStack(
          builder: (context, state, shell) => AppShell(shell: shell),
          branches: [
            StatefulShellBranch(routes: [GoRoute(path: '/', builder: (_, _) => const HomeScreen())]),
            StatefulShellBranch(routes: [GoRoute(path: '/explore', builder: (_, _) => const ExploreScreen())]),
            StatefulShellBranch(routes: [GoRoute(path: '/bookings', builder: (_, _) => const BookingsScreen())]),
            StatefulShellBranch(routes: [GoRoute(path: '/account', builder: (_, _) => const ProfileScreen())]),
          ],
        ),
      ],
    ));

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Scaffold(
      body: Stack(children: [
        Positioned.fill(child: shell),
        // Bo : présent sur tous les onglets, au-dessus de la barre de navigation.
        const Positioned(right: 16, bottom: 16, child: BoLauncher()),
      ]),
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        onDestinationSelected: (i) => shell.goBranch(i, initialLocation: i == shell.currentIndex),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.home_outlined), selectedIcon: const Icon(Icons.home_rounded), label: l10n.navHome),
          NavigationDestination(icon: const Icon(Icons.search_rounded), selectedIcon: const Icon(Icons.search_rounded), label: l10n.navExplore),
          NavigationDestination(icon: const Icon(Icons.calendar_month_outlined), selectedIcon: const Icon(Icons.calendar_month_rounded), label: l10n.navBookings),
          NavigationDestination(icon: const Icon(Icons.person_outline_rounded), selectedIcon: const Icon(Icons.person_rounded), label: l10n.navAccount),
        ],
      ),
    );
  }
}
