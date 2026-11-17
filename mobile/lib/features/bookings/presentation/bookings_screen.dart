import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error_text.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/common.dart';
import '../../accommodations/presentation/accommodation_card.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/booking_repository.dart';
import '../domain/booking.dart';
import 'booking_widgets.dart';

/// Onglet « Réservations » : les séjours du voyageur par statut (à venir, passés, annulés).
class BookingsScreen extends ConsumerStatefulWidget {
  const BookingsScreen({super.key});

  @override
  ConsumerState<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends ConsumerState<BookingsScreen> {
  BookingTab _tab = BookingTab.upcoming;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final user = ref.watch(authControllerProvider).value;

    if (user == null) {
      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 24),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(l10n.bookingsTitle, style: theme.textTheme.headlineMedium),
            Expanded(
              child: Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.calendar_month_rounded, size: 54, color: Brand.grayGreen),
                  const SizedBox(height: 16),
                  Text(l10n.bookingsLoginPrompt, textAlign: TextAlign.center, style: theme.textTheme.bodyLarge),
                  const SizedBox(height: 22),
                  FilledButton(onPressed: () => context.go('/account'), style: FilledButton.styleFrom(minimumSize: const Size(220, 50)), child: Text(l10n.loginSubmit)),
                ]),
              ),
            ),
          ]),
        ),
      );
    }

    final bookings = ref.watch(myBookingsProvider);
    final now = DateTime.now();

    return SafeArea(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(padding: const EdgeInsets.fromLTRB(20, 14, 20, 12), child: Text(l10n.bookingsTitle, style: theme.textTheme.headlineMedium)),
        bookings.when(
          loading: () => const Expanded(child: Padding(padding: EdgeInsets.all(20), child: Column(children: [Skeleton(height: 100), SizedBox(height: 12), Skeleton(height: 100)]))),
          error: (e, _) => Expanded(child: ErrorView(message: errorText(e, l10n), onRetry: () => ref.invalidate(myBookingsProvider))),
          data: (all) {
            int count(BookingTab t) => all.where((b) => b.tab(now) == t).length;
            final list = all.where((b) => b.tab(now) == _tab).toList()..sort((a, b) => _tab == BookingTab.upcoming ? a.checkIn.compareTo(b.checkIn) : b.checkIn.compareTo(a.checkIn));

            return Expanded(
              child: Column(children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: SegmentedButton<BookingTab>(
                    key: const Key('bookings-tabs'),
                    showSelectedIcon: false,
                    segments: [
                      ButtonSegment(value: BookingTab.upcoming, label: Text('${l10n.bookingsTabUpcoming} (${count(BookingTab.upcoming)})')),
                      ButtonSegment(value: BookingTab.past, label: Text('${l10n.bookingsTabPast} (${count(BookingTab.past)})')),
                      ButtonSegment(value: BookingTab.cancelled, label: Text('${l10n.bookingsTabCancelled} (${count(BookingTab.cancelled)})')),
                    ],
                    selected: {_tab},
                    onSelectionChanged: (s) => setState(() => _tab = s.first),
                    style: SegmentedButton.styleFrom(selectedBackgroundColor: Brand.black, selectedForegroundColor: Colors.white, textStyle: const TextStyle(fontFamily: Brand.fontText, fontSize: 12.5, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: RefreshIndicator(
                    color: Brand.red,
                    onRefresh: () async {
                      ref.invalidate(myBookingsProvider);
                      await ref.read(myBookingsProvider.future);
                    },
                    child: list.isEmpty
                        ? ListView(children: [_Empty(tab: _tab)])
                        : ListView.separated(
                            padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                            itemCount: list.length,
                            separatorBuilder: (_, _) => const SizedBox(height: 12),
                            itemBuilder: (_, i) => _BookingCard(booking: list[i], now: now),
                          ),
                  ),
                ),
              ]),
            );
          },
        ),
      ]),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.tab});

  final BookingTab tab;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final (title, sub) = switch (tab) {
      BookingTab.upcoming => (l10n.bookingsEmptyUpcoming, l10n.bookingsEmptyUpcomingSub),
      BookingTab.past => (l10n.bookingsEmptyPast, null),
      BookingTab.cancelled => (l10n.bookingsEmptyCancelled, null),
    };

    return Padding(
      padding: const EdgeInsets.fromLTRB(32, 64, 32, 0),
      child: Column(children: [
        const CircleAvatar(radius: 36, backgroundColor: Brand.surfaceMuted, child: Icon(Icons.calendar_month_outlined, size: 34, color: Brand.black)),
        const SizedBox(height: 16),
        Text(title, key: const Key('bookings-empty'), textAlign: TextAlign.center, style: theme.textTheme.titleLarge),
        if (sub != null) ...[const SizedBox(height: 6), Text(sub, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted))],
        if (tab == BookingTab.upcoming) ...[const SizedBox(height: 18), FilledButton(onPressed: () => context.go('/explore'), style: FilledButton.styleFrom(minimumSize: const Size(220, 50)), child: Text(l10n.bookingsExplore))],
      ]),
    );
  }
}

class _BookingCard extends StatelessWidget {
  const _BookingCard({required this.booking, required this.now});

  final Booking booking;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final b = booking;

    return Material(
      color: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22), side: const BorderSide(color: Brand.border)),
      child: InkWell(
        key: Key('booking-${b.id}'),
        borderRadius: BorderRadius.circular(22),
        onTap: () => context.push('/bookings/${b.id}'),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(children: [
            ClipRRect(borderRadius: BorderRadius.circular(16), child: SizedBox(width: 84, height: 84, child: RemoteImage(url: b.imageUrl))),
            const SizedBox(width: 12),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(b.accommodationName, maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleMedium),
                Text('${stayDates(context, b)} · ${l10n.bookingGuestsCount(b.guests)}', maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.bodySmall),
                const SizedBox(height: 8),
                Wrap(spacing: 6, runSpacing: 4, children: [
                  StatusBadge(booking: b, now: now),
                  if (b.wasModified && b.status != BookingStatus.cancelled) _Tag(l10n.statusModified),
                ]),
              ]),
            ),
            const Icon(Icons.chevron_right_rounded, color: Brand.textMuted),
          ]),
        ),
      ),
    );
  }
}

class _Tag extends StatelessWidget {
  const _Tag(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: Brand.beige, borderRadius: BorderRadius.circular(20)),
        child: Text(text, style: const TextStyle(fontFamily: Brand.fontText, fontSize: 12, fontWeight: FontWeight.w700, color: Brand.black)),
      );
}
