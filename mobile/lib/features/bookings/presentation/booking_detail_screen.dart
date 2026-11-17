import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error_text.dart';
import '../../../core/format.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/common.dart';
import '../../accommodations/presentation/accommodation_card.dart';
import '../data/booking_repository.dart';
import '../domain/booking.dart';
import 'booking_widgets.dart';

/// Détail d'une réservation : statut, dates, code d'arrivée, montants, et les actions possibles (payer, annuler).
class BookingDetailScreen extends ConsumerWidget {
  const BookingDetailScreen({super.key, required this.id});

  final int id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final detail = ref.watch(bookingDetailProvider(id));

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(tooltip: l10n.authBack, icon: const Icon(Icons.arrow_back_rounded), onPressed: () => context.canPop() ? context.pop() : context.go('/bookings')),
        title: Text(l10n.bookingsTitle),
      ),
      body: detail.when(
        loading: () => const Padding(padding: EdgeInsets.all(20), child: Skeleton(height: 240, radius: 20)),
        error: (e, _) => ErrorView(message: errorText(e, l10n), onRetry: () => ref.invalidate(bookingDetailProvider(id))),
        data: (b) => _Content(booking: b),
      ),
    );
  }
}

class _Content extends ConsumerWidget {
  const _Content({required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = Localizations.localeOf(context).languageCode;
    final loc = MaterialLocalizations.of(context);
    final now = DateTime.now();
    final b = booking;
    String money(num n) => '${formatFcfa(n, lang)} FCFA';
    final paid = b.amountPaid ?? 0;
    final balance = b.paymentType == 'guarantee' && paid > 0 ? (b.totalPrice - paid).clamp(0, double.infinity) : 0;
    final note = switch (b.status) {
      BookingStatus.awaitingHost => b.expiresAt != null ? '${l10n.bookingAwaitingNote} ${l10n.bookingAwaitingBefore(loc.formatMediumDate(b.expiresAt!))}' : l10n.bookingAwaitingNote,
      BookingStatus.pending when b.needsPayment(now) => l10n.bookingPendingNote,
      _ => null,
    };

    return ListView(padding: const EdgeInsets.fromLTRB(20, 4, 20, 28), children: [
      ClipRRect(borderRadius: BorderRadius.circular(22), child: SizedBox(height: 150, child: RemoteImage(url: b.imageUrl))),
      const SizedBox(height: 14),
      Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Expanded(child: Text(b.accommodationName, style: theme.textTheme.titleLarge)),
        const SizedBox(width: 10),
        StatusBadge(booking: b, now: now),
      ]),
      const SizedBox(height: 4),
      Text([?b.city, ?b.roomName, if (b.bookingNumber != null) l10n.bookingNumber(b.bookingNumber!)].join(' · '), style: theme.textTheme.bodySmall),
      if (note != null) ...[
        const SizedBox(height: 14),
        Container(key: const Key('booking-note'), padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: b.status == BookingStatus.pending ? const Color(0xFFFFF1D6) : Brand.surfaceMuted, borderRadius: BorderRadius.circular(16)), child: Text(note, style: theme.textTheme.bodyMedium)),
      ],
      const SizedBox(height: 14),
      Row(children: [
        Expanded(child: _Tile(l10n.bookingCheckIn, loc.formatMediumDate(b.checkIn))),
        const SizedBox(width: 10),
        Expanded(child: _Tile(l10n.bookingCheckOut, loc.formatMediumDate(b.checkOut))),
      ]),
      if (b.status == BookingStatus.confirmed && b.confirmationCode != null) ...[
        const SizedBox(height: 10),
        Container(
          key: const Key('booking-code'),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(20)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(l10n.bookingArrivalCode, style: theme.textTheme.bodySmall),
            Text(b.confirmationCode!, style: const TextStyle(fontFamily: Brand.fontText, fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: 3)),
            Text(l10n.bookingArrivalCodeHint, style: theme.textTheme.bodySmall),
          ]),
        ),
      ],
      const SizedBox(height: 10),
      Container(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 10),
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: Brand.border)),
        child: Column(children: [
          _Line(l10n.bookingTotal, money(b.totalPrice)),
          if (paid > 0) _Line(l10n.bookingPaid, money(paid), green: true),
          if (balance > 0) _Line(l10n.bookingBalance, money(balance)),
          if (b.paymentType != null && paid > 0) _Line('', b.paymentType == 'guarantee' ? l10n.bookingPayGuarantee : l10n.bookingPayFull, muted: true),
        ]),
      ),
      if (b.specialRequests != null) ...[
        const SizedBox(height: 10),
        _Tile(l10n.bookingRequests, b.specialRequests!),
      ],
      if (b.needsPayment(now)) ...[
        const SizedBox(height: 18),
        FilledButton(key: const Key('booking-pay'), onPressed: () => context.push('/bookings/${b.id}/pay'), child: Text(l10n.bookingPay)),
      ],
      if (b.canCancel(now)) ...[
        const SizedBox(height: 10),
        OutlinedButton(
          key: const Key('booking-cancel'),
          onPressed: () => context.push('/bookings/${b.id}/cancel'),
          style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFB42318), side: const BorderSide(color: Color(0xFFB42318))),
          child: Text(l10n.bookingCancelCta),
        ),
      ],
    ]);
  }
}

class _Tile extends StatelessWidget {
  const _Tile(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(18)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: theme.textTheme.bodySmall), Text(value, style: theme.textTheme.titleMedium)]),
    );
  }
}

class _Line extends StatelessWidget {
  const _Line(this.label, this.value, {this.green = false, this.muted = false});

  final String label;
  final String value;
  final bool green;
  final bool muted;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: green ? FontWeight.w700 : FontWeight.w400, color: green ? const Color(0xFF0E7A4B) : (muted ? Brand.textMuted : Brand.black));

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(mainAxisAlignment: muted ? MainAxisAlignment.end : MainAxisAlignment.spaceBetween, children: [if (!muted) Expanded(child: Text(label, style: style)), Text(value, style: style)]),
    );
  }
}
