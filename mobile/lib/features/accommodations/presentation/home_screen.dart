import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error_text.dart';
import '../../../core/format.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/common.dart';
import '../data/accommodation_repository.dart';
import '../domain/accommodation.dart';
import 'accommodation_card.dart';
import 'explore_screen.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final cities = ref.watch(topCitiesProvider);
    final featured = ref.watch(featuredAccommodationsProvider);

    Future<void> refresh() async {
      ref.invalidate(topCitiesProvider);
      ref.invalidate(featuredAccommodationsProvider);
      await Future.wait([ref.read(topCitiesProvider.future).catchError((_) => <City>[]), ref.read(featuredAccommodationsProvider.future).catchError((_) => <Accommodation>[])]);
    }

    return SafeArea(
      child: RefreshIndicator(
        color: Brand.red,
        onRefresh: refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          children: [
            const Align(alignment: Alignment.centerLeft, child: BoSejourLogo()),
            const SizedBox(height: 22),
            Text(l10n.slogan, style: const TextStyle(fontFamily: Brand.fontSlogan, fontSize: 20, color: Brand.red)),
            const SizedBox(height: 2),
            Text(l10n.homeGreeting, style: theme.textTheme.headlineMedium),
            const SizedBox(height: 14),
            _SearchField(hint: l10n.homeSearchHint, onTap: () => context.go('/explore')),
            const SizedBox(height: 28),
            Text(l10n.homeDestinations, style: theme.textTheme.titleLarge),
            const SizedBox(height: 12),
            SizedBox(
              height: 176,
              child: cities.when(
                data: (list) => ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: list.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 12),
                  itemBuilder: (_, i) => _CityCard(
                    city: list[i],
                    onTap: () {
                      ref.read(exploreQueryProvider.notifier).set(list[i].name);
                      context.go('/explore');
                    },
                  ),
                ),
                loading: () => ListView(scrollDirection: Axis.horizontal, children: List.generate(3, (_) => const Padding(padding: EdgeInsets.only(right: 12), child: Skeleton(width: 140, height: 176, radius: 20)))),
                error: (e, _) => ErrorView(compact: true, message: errorText(e, l10n), onRetry: () => ref.invalidate(topCitiesProvider)),
              ),
            ),
            const SizedBox(height: 28),
            Text(l10n.homeDiscover, style: theme.textTheme.titleLarge),
            const SizedBox(height: 12),
            featured.when(
              data: (list) => Column(children: [for (final a in list) Padding(padding: const EdgeInsets.only(bottom: 16), child: AccommodationCard(accommodation: a))]),
              loading: () => Column(children: List.generate(2, (_) => const Padding(padding: EdgeInsets.only(bottom: 16), child: Skeleton(height: 280, radius: 20)))),
              error: (e, _) => SizedBox(height: 220, child: ErrorView(message: errorText(e, l10n), onRetry: () => ref.invalidate(featuredAccommodationsProvider))),
            ),
          ],
        ),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.hint, required this.onTap});

  final String hint;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Brand.surfaceMuted,
        borderRadius: BorderRadius.circular(28),
        child: InkWell(
          borderRadius: BorderRadius.circular(28),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            child: Row(children: [
              const Icon(Icons.search_rounded, color: Brand.red),
              const SizedBox(width: 12),
              Expanded(child: Text(hint, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Brand.textMuted), overflow: TextOverflow.ellipsis)),
            ]),
          ),
        ),
      );
}

class _CityCard extends StatelessWidget {
  const _CityCard({required this.city, required this.onTap});

  final City city;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final lang = Localizations.localeOf(context).languageCode;

    return SizedBox(
      width: 148,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(fit: StackFit.expand, children: [
          RemoteImage(url: city.imageUrl),
          const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.transparent, Color(0xCC000000)]))),
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
              Text(city.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontFamily: Brand.fontText, fontWeight: FontWeight.w700, fontSize: 16, color: Colors.white)),
              Text(l10n.homeAccommodationsCount(city.count), style: const TextStyle(fontFamily: Brand.fontText, fontSize: 12, color: Colors.white70)),
              Text(l10n.homeFromPrice(formatFcfa(city.fromPrice, lang)), style: const TextStyle(fontFamily: Brand.fontText, fontSize: 12, color: Colors.white70)),
            ]),
          ),
          Material(type: MaterialType.transparency, child: InkWell(onTap: onTap)),
        ]),
      ),
    );
  }
}
