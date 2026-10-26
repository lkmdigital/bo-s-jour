import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/accommodations/presentation/explore_screen.dart';
import '../../features/accommodations/presentation/home_screen.dart';
import '../../features/bookings/presentation/bookings_screen.dart';
import '../../features/profile/presentation/profile_screen.dart';
import '../../l10n/app_localizations.dart';

/// Les quatre onglets de l'appli. Chaque onglet garde son propre état quand on passe de l'un à l'autre.
final routerProvider = Provider<GoRouter>((ref) => GoRouter(
      initialLocation: '/',
      routes: [
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
      body: shell,
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
