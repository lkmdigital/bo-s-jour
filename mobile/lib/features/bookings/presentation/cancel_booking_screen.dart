import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error_text.dart';
import '../../../core/format.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/common.dart';
import '../../auth/presentation/auth_scaffold.dart';
import '../data/booking_repository.dart';
import '../domain/booking.dart';
import 'booking_widgets.dart';

/// Annulation : rappel de la politique de l'établissement, motif, confirmation. Le serveur décide de l'avoir éventuel.
class CancelBookingScreen extends ConsumerStatefulWidget {
  const CancelBookingScreen({super.key, required this.id});

  final int id;

  @override
  ConsumerState<CancelBookingScreen> createState() => _CancelBookingScreenState();
}

class _CancelBookingScreenState extends ConsumerState<CancelBookingScreen> {
  final _other = TextEditingController();
  int? _reason;
  bool _confirmed = false;
  bool _busy = false;
  String? _error;
  CancelResult? _done;

  @override
  void dispose() {
    _other.dispose();
    super.dispose();
  }

  Future<void> _submit(String reason) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await ref.read(bookingRepositoryProvider).cancel(widget.id, reason);
      ref.invalidate(myBookingsProvider);
      ref.invalidate(bookingDetailProvider(widget.id));
      if (mounted) {
        setState(() {
          _busy = false;
          _done = result;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = errorText(e, l10n);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final detail = ref.watch(bookingDetailProvider(widget.id));

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: _done != null ? null : IconButton(tooltip: l10n.authBack, icon: const Icon(Icons.arrow_back_rounded), onPressed: () => context.canPop() ? context.pop() : context.go('/bookings')),
        title: Text(l10n.cancelTitle),
      ),
      body: _done != null
          ? _Done(result: _done!)
          : detail.when(
              loading: () => const Padding(padding: EdgeInsets.all(20), child: Skeleton(height: 200, radius: 20)),
              error: (e, _) => ErrorView(message: errorText(e, l10n), onRetry: () => ref.invalidate(bookingDetailProvider(widget.id))),
              data: _form,
            ),
    );
  }

  Widget _form(Booking b) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = Localizations.localeOf(context).languageCode;
    final now = DateTime.now();
    final reasons = [l10n.cancelReason1, l10n.cancelReason2, l10n.cancelReason3, l10n.cancelReason4, l10n.cancelReason5];
    final isOther = _reason == reasons.length - 1;
    final paid = b.amountPaid ?? 0;
    final reason = _reason == null ? '' : (isOther ? _other.text : reasons[_reason!]);

    if (!b.canCancel(now)) {
      return Center(child: Padding(padding: const EdgeInsets.all(24), child: Column(mainAxisSize: MainAxisSize.min, children: [StatusBadge(booking: b, now: now), const SizedBox(height: 14), Text(l10n.cancelImpossible, key: const Key('cancel-impossible'), textAlign: TextAlign.center, style: theme.textTheme.bodyLarge)])));
    }

    // Même message que sur le site, d'après les données de la réservation : le montant réel de l'avoir est décidé par le serveur.
    final (title, lines, tone) = b.isNonRefundable
        ? (l10n.cancelNonRefundable, [if (paid > 0) l10n.cancelNonRefundablePaid(formatFcfa(paid, lang))], const Color(0xFFFFF1F1))
        : b.freeCancellation(now)
            ? (l10n.cancelFree, [if (paid > 0) l10n.cancelCreditNote(formatFcfa(paid, lang))], const Color(0xFFEFF7F3))
            : (l10n.cancelLate, [l10n.cancelLateText, if (paid > 0) l10n.cancelLateCredit(formatFcfa(paid, lang))], const Color(0xFFFFFBEB));

    return ListView(padding: const EdgeInsets.fromLTRB(20, 4, 20, 28), children: [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(18)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(b.accommodationName, style: theme.textTheme.titleMedium),
          Text(stayDates(context, b), style: theme.textTheme.bodySmall),
          Text('${l10n.bookingTotal} : ${formatFcfa(b.totalPrice, lang)} FCFA', style: theme.textTheme.bodySmall),
        ]),
      ),
      const SizedBox(height: 14),
      Container(
        key: const Key('cancel-policy'),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: tone, borderRadius: BorderRadius.circular(16)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: theme.textTheme.titleMedium), for (final l in lines) Padding(padding: const EdgeInsets.only(top: 4), child: Text(l, style: theme.textTheme.bodyMedium))]),
      ),
      const SizedBox(height: 18),
      Text(l10n.cancelReason, style: theme.textTheme.titleMedium),
      RadioGroup<int>(
        groupValue: _reason,
        onChanged: (v) => setState(() => _reason = v),
        child: Column(children: [for (var i = 0; i < reasons.length; i++) RadioListTile<int>(key: Key('reason-$i'), value: i, title: Text(reasons[i]), contentPadding: EdgeInsets.zero, activeColor: Brand.red, dense: true)]),
      ),
      if (isOther) TextField(key: const Key('cancel-other'), controller: _other, minLines: 2, maxLines: 4, maxLength: 500, onChanged: (_) => setState(() {}), decoration: InputDecoration(hintText: l10n.cancelReasonOther, counterText: '')),
      const SizedBox(height: 8),
      InkWell(
        key: const Key('cancel-confirm'),
        borderRadius: BorderRadius.circular(8),
        onTap: () => setState(() => _confirmed = !_confirmed),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(padding: const EdgeInsets.only(top: 2), child: AnimatedContainer(duration: const Duration(milliseconds: 180), width: 24, height: 24, decoration: BoxDecoration(color: _confirmed ? Brand.black : Colors.transparent, borderRadius: BorderRadius.circular(8), border: Border.all(color: _confirmed ? Brand.black : const Color(0xFFC9C6BD), width: 2)), child: _confirmed ? const Icon(Icons.check_rounded, size: 16, color: Colors.white) : null)),
          const SizedBox(width: 12),
          Expanded(child: Text(l10n.cancelConfirmCheck, style: theme.textTheme.bodyMedium)),
        ]),
      ),
      const SizedBox(height: 18),
      if (_error != null) AuthErrorBanner(_error!),
      FilledButton(
        key: const Key('cancel-submit'),
        onPressed: !_confirmed || _reason == null || (isOther && _other.text.trim().isEmpty) || _busy ? null : () => _submit(reason),
        style: FilledButton.styleFrom(backgroundColor: const Color(0xFFB42318)),
        child: _busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white)) : Text(l10n.cancelSubmit),
      ),
      const SizedBox(height: 10),
      OutlinedButton(onPressed: () => context.canPop() ? context.pop() : context.go('/bookings'), child: Text(l10n.cancelKeep)),
    ]);
  }
}

class _Done extends StatelessWidget {
  const _Done({required this.result});

  final CancelResult result;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = Localizations.localeOf(context).languageCode;
    final credit = result.creditAmount;

    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        const Spacer(),
        const Center(child: CircleAvatar(radius: 48, backgroundColor: Brand.surfaceMuted, child: Icon(Icons.account_balance_wallet_outlined, size: 42, color: Brand.black))),
        const SizedBox(height: 22),
        Text(l10n.cancelDoneTitle, key: const Key('cancel-done'), textAlign: TextAlign.center, style: theme.textTheme.headlineMedium),
        const SizedBox(height: 8),
        Text(credit != null && credit > 0 ? l10n.cancelDoneCredit(formatFcfa(credit, lang)) : l10n.cancelDoneText, key: const Key('cancel-done-text'), textAlign: TextAlign.center, style: theme.textTheme.bodyLarge?.copyWith(color: Brand.textMuted)),
        const Spacer(),
        FilledButton(key: const Key('cancel-done-explore'), onPressed: () => context.go('/explore'), child: Text(l10n.bookingsExplore)),
        const SizedBox(height: 10),
        OutlinedButton(key: const Key('cancel-done-bookings'), onPressed: () => context.go('/bookings'), child: Text(l10n.bookSentBookings)),
      ]),
    );
  }
}
