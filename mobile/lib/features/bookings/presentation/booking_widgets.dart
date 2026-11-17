import 'package:flutter/material.dart';

import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/booking.dart';

/// Pastille de statut : couleurs fixes (vert confirmée, orange à payer, gris en attente, rouge annulée).
class StatusBadge extends StatelessWidget {
  const StatusBadge({super.key, required this.booking, required this.now});

  final Booking booking;
  final DateTime now;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final (label, bg, fg) = switch (booking.status) {
      BookingStatus.awaitingHost => (l10n.statusAwaitingHost, const Color(0xFFF1F0EC), Brand.grayDark),
      BookingStatus.pending => (l10n.statusPending, const Color(0xFFFFF1D6), const Color(0xFF8A5B00)),
      BookingStatus.confirmed => (l10n.statusConfirmed, const Color(0xFFDFF3EA), const Color(0xFF0E7A4B)),
      BookingStatus.cancelled => (l10n.statusCancelled, const Color(0xFFFBE3E3), const Color(0xFFB42318)),
      BookingStatus.completed => (l10n.statusCompleted, const Color(0xFFF1F0EC), Brand.grayDark),
    };

    return Container(
      key: const Key('status-badge'),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(fontFamily: Brand.fontText, fontSize: 12, fontWeight: FontWeight.w700, color: fg)),
    );
  }
}

/// « 12 déc. → 14 déc. 2026 » dans la langue de l'appli.
String stayDates(BuildContext context, Booking b) {
  final loc = MaterialLocalizations.of(context);

  return '${loc.formatMediumDate(b.checkIn)} → ${loc.formatMediumDate(b.checkOut)}';
}
