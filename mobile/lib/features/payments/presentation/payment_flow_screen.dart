import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/error_text.dart';
import '../../../core/format.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/common.dart';
import '../../../shared/widgets/confetti.dart';
import '../../accommodations/presentation/accommodation_card.dart';
import '../../auth/presentation/auth_scaffold.dart';
import '../../bookings/data/booking_repository.dart';
import '../../bookings/domain/booking.dart';
import '../../bookings/domain/price_quote.dart';
import '../data/payment_repository.dart';
import '../domain/payment_models.dart';

/// Ouvre la page de la passerelle dans le navigateur intégré (Custom Tabs sur Android, Safari sur iOS). Remplaçable dans les tests.
final urlOpenerProvider = Provider<Future<bool> Function(Uri)>((ref) => (uri) => launchUrl(uri, mode: LaunchMode.inAppBrowserView));

/// Délai entre deux lectures du statut du paiement (le serveur interroge lui-même la passerelle, au plus toutes les 3 s).
final paymentPollIntervalProvider = Provider<Duration>((ref) => const Duration(seconds: 5));

/// MaliaPay marque un paiement « échoué » au bout de 10 minutes sans confirmation : on attend 11 minutes au plus.
const paymentWaitLimit = Duration(minutes: 11);

enum _Step { choose, waiting, done, failed }

/// Paiement dans l'appli : choix intégral ou garantie, moyen de paiement, puis attente de la confirmation.
/// Les montants viennent du serveur ; l'appli n'envoie que le choix du voyageur.
class PaymentFlowScreen extends ConsumerStatefulWidget {
  const PaymentFlowScreen({super.key, required this.bookingId});

  final int bookingId;

  @override
  ConsumerState<PaymentFlowScreen> createState() => _PaymentFlowScreenState();
}

class _PaymentFlowScreenState extends ConsumerState<PaymentFlowScreen> with WidgetsBindingObserver {
  _Step _step = _Step.choose;
  PaymentPlan _plan = PaymentPlan.full;
  String? _method;
  bool _busy = false;
  String? _error;
  int? _paymentId;
  String? _link;
  bool _push = false;
  DateTime? _since;
  Timer? _timer;
  bool _checking = false;
  int _reads = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Retour dans l'appli après la page de paiement : on vérifie tout de suite.
    if (state == AppLifecycleState.resumed && _step == _Step.waiting) _check();
  }

  PayOption? _option(PaymentOptions o) => _plan == PaymentPlan.full || o.fullOnly ? o.full : (o.guarantee ?? o.full);

  Future<void> _pay(Booking b, List<PaymentMethodInfo> methods) async {
    final l10n = AppLocalizations.of(context);
    final method = methods.firstWhere((m) => m.slug == _method);
    final plan = (b.paymentOptions?.fullOnly ?? false) ? PaymentPlan.full : _plan;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final repo = ref.read(paymentRepositoryProvider);
      final init = await repo.initiate(b.id, method: method.slug, plan: plan);
      if (init.requiresOtp) {
        if (mounted) {
          setState(() {
            _busy = false;
            _error = l10n.payUnsupported;
          });
        }
        return;
      }
      var link = init.link;
      if (link == null && !init.awaitingPhone) link = await repo.link(init.paymentId, method.slug);
      if (link == null && !init.awaitingPhone) throw StateError('no link');
      if (!mounted) return;
      setState(() {
        _busy = false;
        _paymentId = init.paymentId;
        _link = link;
        _push = init.awaitingPhone;
        _since = DateTime.now();
        _step = _Step.waiting;
      });
      _reads = 0;
      _startPolling();
      if (link != null) await ref.read(urlOpenerProvider)(Uri.parse(link));
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = e is StateError ? l10n.payLinkMissing : errorText(e, l10n);
        });
      }
    }
  }

  void _startPolling() {
    _timer?.cancel();
    _timer = Timer.periodic(ref.read(paymentPollIntervalProvider), (_) => _check());
  }

  Future<void> _check() async {
    final id = _paymentId;
    if (id == null || _checking || _step != _Step.waiting) return;
    _checking = true;
    _reads++;
    final l10n = AppLocalizations.of(context);
    try {
      final state = await ref.read(paymentRepositoryProvider).status(id);
      if (!mounted || _step != _Step.waiting) return;
      if (state == PaymentState.completed) {
        _timer?.cancel();
        ref.invalidate(myBookingsProvider);
        ref.invalidate(bookingDetailProvider(widget.bookingId));
        setState(() => _step = _Step.done);
      } else if (state == PaymentState.failed) {
        _timer?.cancel();
        setState(() {
          _step = _Step.failed;
          _error = null;
        });
      } else if ((_since != null && DateTime.now().difference(_since!) > paymentWaitLimit) || ref.read(paymentPollIntervalProvider) * _reads > paymentWaitLimit) {
        _timer?.cancel();
        setState(() {
          _step = _Step.choose;
          _error = l10n.payTimeout;
        });
      }
    } catch (_) {
      // passage à vide (réseau) : on réessaie au prochain tour
    } finally {
      _checking = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final booking = ref.watch(bookingDetailProvider(widget.bookingId));

    return Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          leading: _step == _Step.done ? null : IconButton(key: const Key('pay-back'), tooltip: l10n.authBack, icon: const Icon(Icons.arrow_back_rounded), onPressed: () => context.canPop() ? context.pop() : context.go('/bookings/${widget.bookingId}')),
          title: Text(l10n.payTitle),
        ),
        body: booking.when(
          loading: () => const Padding(padding: EdgeInsets.all(20), child: Skeleton(height: 220, radius: 20)),
          error: (e, _) => ErrorView(message: errorText(e, l10n), onRetry: () => ref.invalidate(bookingDetailProvider(widget.bookingId))),
          data: (b) {
            if (_step == _Step.waiting) return _waiting(b);
            if (_step == _Step.done) return _Done(booking: b);
            if (_step == _Step.failed) return _Failed(onRetry: () => setState(() => _step = _Step.choose));

            return _choose(b);
          },
        ),
    );
  }

  // ───── Choix du mode et du moyen de paiement ─────

  Widget _choose(Booking b) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = Localizations.localeOf(context).languageCode;
    final now = DateTime.now();

    if (b.paymentStatus == 'paid') return _Notice(icon: Icons.check_circle_outline_rounded, text: l10n.payAlreadyPaid, booking: b);
    if (b.status == BookingStatus.awaitingHost) return _Notice(icon: Icons.hourglass_top_rounded, text: l10n.payNotYet, booking: b);
    if (!b.needsPayment(now)) return _Notice(icon: Icons.info_outline_rounded, text: l10n.cancelImpossible, booking: b);

    final options = b.paymentOptions ?? const PaymentOptions();
    final full = options.full;
    final guarantee = options.fullOnly ? null : options.guarantee;
    final methods = ref.watch(paymentMethodsProvider);
    final selected = _option(options);

    return SafeArea(
      child: Column(children: [
        Expanded(
          child: ListView(padding: const EdgeInsets.fromLTRB(20, 4, 20, 16), children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(18)),
              child: Row(children: [
                ClipRRect(borderRadius: BorderRadius.circular(12), child: SizedBox(width: 56, height: 56, child: RemoteImage(url: b.imageUrl))),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(b.accommodationName, maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleMedium), Text(_dates(b), style: theme.textTheme.bodySmall)])),
              ]),
            ),
            const SizedBox(height: 18),
            Text(l10n.payChoosePlan, style: theme.textTheme.titleLarge),
            const SizedBox(height: 10),
            if (full != null)
              _PlanCard(
                key: const Key('plan-full'),
                selected: _plan == PaymentPlan.full || guarantee == null,
                badge: (full.discountPercent ?? 0) > 0 ? '${l10n.payRecommended} · ${l10n.payFullDiscount('${full.discountPercent}')}' : null,
                title: l10n.payFullTitle,
                amount: '${formatFcfa(full.amount, lang)} FCFA',
                strike: (full.discountPercent ?? 0) > 0 && full.originalAmount != null ? '${formatFcfa(full.originalAmount!, lang)} FCFA' : null,
                subtitle: l10n.payFullSub,
                onTap: () => setState(() => _plan = PaymentPlan.full),
              ),
            if (guarantee != null) ...[
              const SizedBox(height: 10),
              _PlanCard(
                key: const Key('plan-guarantee'),
                selected: _plan == PaymentPlan.guarantee,
                title: l10n.payGuaranteeTitle,
                amount: '${formatFcfa(guarantee.amount, lang)} FCFA',
                subtitle: guarantee.balanceAtHotel != null ? l10n.payGuaranteeSub(formatFcfa(guarantee.balanceAtHotel!, lang)) : null,
                onTap: () => setState(() => _plan = PaymentPlan.guarantee),
              ),
            ],
            const SizedBox(height: 18),
            Text(l10n.payMethod, style: theme.textTheme.titleLarge),
            const SizedBox(height: 10),
            methods.when(
              loading: () => const Column(children: [Skeleton(height: 64), SizedBox(height: 8), Skeleton(height: 64)]),
              error: (e, _) => ErrorView(message: errorText(e, l10n), onRetry: () => ref.invalidate(paymentMethodsProvider), compact: true),
              data: (list) {
                if (list.isEmpty) return Text(l10n.payNoMethods, style: theme.textTheme.bodyMedium);
                _method ??= list.first.slug;

                return Column(children: [for (final m in list) ...[_MethodRow(method: m, selected: m.slug == _method, onTap: () => setState(() => _method = m.slug)), const SizedBox(height: 8)]]);
              },
            ),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            if (_error != null) AuthErrorBanner(_error!),
            FilledButton(
              key: const Key('pay-submit'),
              onPressed: _busy || selected == null || !(methods.value?.any((m) => m.slug == _method) ?? false) ? null : () => _pay(b, methods.value!),
              child: _busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white)) : Text(selected == null ? l10n.payTitle : l10n.paySubmit(formatFcfa(selected.amount, lang))),
            ),
          ]),
        ),
      ]),
    );
  }

  String _dates(Booking b) {
    final loc = MaterialLocalizations.of(context);

    return '${loc.formatMediumDate(b.checkIn)} → ${loc.formatMediumDate(b.checkOut)}';
  }

  // ───── Attente de la confirmation ─────

  Widget _waiting(Booking b) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = Localizations.localeOf(context).languageCode;
    final method = ref.read(paymentMethodsProvider).value?.where((m) => m.slug == _method).firstOrNull;
    final name = method?.name ?? '';
    final amount = _option(b.paymentOptions ?? const PaymentOptions());

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Spacer(),
          Center(child: CircleAvatar(radius: 48, backgroundColor: Brand.surfaceMuted, child: Icon(_push ? Icons.smartphone_rounded : Icons.open_in_new_rounded, size: 40, color: Brand.black))),
          const SizedBox(height: 22),
          Text(_push ? l10n.payWaitingPushTitle : l10n.payWaitingLinkTitle, key: const Key('pay-waiting'), textAlign: TextAlign.center, style: theme.textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text(_push ? l10n.payWaitingPushText(name, amount == null ? '' : formatFcfa(amount.amount, lang)) : l10n.payWaitingLinkText(name), textAlign: TextAlign.center, style: theme.textTheme.bodyLarge?.copyWith(color: Brand.textMuted)),
          const SizedBox(height: 22),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(16)),
            child: Row(children: [
              const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 3, color: Brand.red)),
              const SizedBox(width: 14),
              Expanded(child: Text(l10n.payWaitingStatus, style: theme.textTheme.bodyMedium)),
            ]),
          ),
          const Spacer(),
          if (_link != null) ...[
            FilledButton(key: const Key('pay-reopen'), onPressed: () => ref.read(urlOpenerProvider)(Uri.parse(_link!)), child: Text(l10n.payReopen)),
            const SizedBox(height: 10),
          ],
          OutlinedButton(key: const Key('pay-check'), onPressed: _check, child: Text(l10n.payCheck)),
        ]),
      ),
    );
  }
}

class _PlanCard extends StatelessWidget {
  const _PlanCard({super.key, required this.selected, required this.title, required this.amount, required this.onTap, this.badge, this.strike, this.subtitle});

  final bool selected;
  final String title;
  final String amount;
  final String? badge;
  final String? strike;
  final String? subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      borderRadius: BorderRadius.circular(22),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: selected ? Colors.white : Brand.surfaceMuted, borderRadius: BorderRadius.circular(22), border: Border.all(color: selected ? Brand.black : Colors.transparent, width: 1.6)),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              if (badge != null) Container(margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4), decoration: BoxDecoration(color: const Color(0xFFDFF3EA), borderRadius: BorderRadius.circular(20)), child: Text(badge!, style: const TextStyle(fontFamily: Brand.fontText, fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF0E7A4B)))),
              Text(title, style: theme.textTheme.titleMedium),
              const SizedBox(height: 2),
              Row(crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
                Text(amount, style: theme.textTheme.titleLarge?.copyWith(fontSize: 22)),
                if (strike != null) ...[const SizedBox(width: 8), Text(strike!, style: theme.textTheme.bodySmall?.copyWith(decoration: TextDecoration.lineThrough))],
              ]),
              if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 4), child: Text(subtitle!, style: theme.textTheme.bodySmall)),
            ]),
          ),
          Icon(selected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded, color: selected ? Brand.black : const Color(0xFFC9C6BD)),
        ]),
      ),
    );
  }
}

class _MethodRow extends StatelessWidget {
  const _MethodRow({required this.method, required this.selected, required this.onTap});

  final PaymentMethodInfo method;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      key: Key('method-${method.slug}'),
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: selected ? Colors.white : Brand.surfaceMuted, borderRadius: BorderRadius.circular(20), border: Border.all(color: selected ? Brand.black : Colors.transparent, width: 1.6)),
        child: Row(children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Container(
              width: 46,
              height: 46,
              color: Colors.white,
              alignment: Alignment.center,
              child: method.iconUrl == null ? Text(method.name.characters.first, style: theme.textTheme.titleMedium) : RemoteImage(url: method.iconUrl, fit: BoxFit.contain),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: Text(method.name, style: theme.textTheme.titleMedium)),
          Icon(selected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded, color: selected ? Brand.black : const Color(0xFFC9C6BD)),
        ]),
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.icon, required this.text, required this.booking});

  final IconData icon;
  final String text;
  final Booking booking;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 48, color: Brand.grayGreen),
            const SizedBox(height: 14),
            Text(text, key: const Key('pay-notice'), textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyLarge),
            const SizedBox(height: 20),
            OutlinedButton(onPressed: () => context.go('/bookings/${booking.id}'), style: OutlinedButton.styleFrom(minimumSize: const Size(220, 50)), child: Text(AppLocalizations.of(context).payDoneView)),
          ]),
        ),
      );
}

class _Failed extends StatelessWidget {
  const _Failed({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const Spacer(),
          const Center(child: CircleAvatar(radius: 48, backgroundColor: Color(0xFFFBE3E3), child: Icon(Icons.close_rounded, size: 44, color: Color(0xFFB42318)))),
          const SizedBox(height: 22),
          Text(l10n.payFailedTitle, key: const Key('pay-failed'), textAlign: TextAlign.center, style: theme.textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text(l10n.payFailedText, textAlign: TextAlign.center, style: theme.textTheme.bodyLarge?.copyWith(color: Brand.textMuted)),
          const Spacer(),
          FilledButton(key: const Key('pay-retry'), onPressed: onRetry, child: Text(l10n.payRetry)),
        ]),
      ),
    );
  }
}

class _Done extends StatelessWidget {
  const _Done({required this.booking});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return Stack(children: [
      const Positioned.fill(child: Confetti()),
      SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            const Spacer(),
            Center(
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: const Duration(milliseconds: 700),
                curve: Curves.elasticOut,
                builder: (_, v, child) => Transform.scale(scale: v, child: child),
                child: Container(width: 104, height: 104, decoration: const BoxDecoration(color: Color(0xFFDFF3EA), shape: BoxShape.circle), child: const Icon(Icons.check_rounded, size: 56, color: Color(0xFF0E7A4B))),
              ),
            ),
            const SizedBox(height: 22),
            Text(l10n.payDoneTitle, key: const Key('pay-done'), textAlign: TextAlign.center, style: theme.textTheme.headlineMedium),
            const SizedBox(height: 8),
            Text(l10n.payDoneText, textAlign: TextAlign.center, style: theme.textTheme.bodyLarge?.copyWith(color: Brand.textMuted)),
            const Spacer(flex: 2),
            FilledButton(key: const Key('pay-done-view'), onPressed: () => context.go('/bookings/${booking.id}'), child: Text(l10n.payDoneView)),
          ]),
        ),
      ),
    ]);
  }
}
