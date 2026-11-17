import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error_text.dart';
import '../../../core/format.dart';
import '../../../core/phone.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/common.dart';
import '../../accommodations/domain/accommodation_detail.dart';
import '../../accommodations/data/accommodation_repository.dart';
import '../../accommodations/presentation/accommodation_card.dart';
import '../../auth/presentation/auth_controller.dart';
import '../../auth/presentation/auth_scaffold.dart';
import '../data/booking_repository.dart';
import '../domain/booking_request.dart';
import '../domain/price_quote.dart';

/// Réservation dans l'appli : séjour → voyageur → récapitulatif → demande envoyée à l'hôte.
/// Aucun paiement ici : l'hôte confirme d'abord (24 h), puis le voyageur règle depuis « Mes réservations ».
/// Tous les montants viennent du serveur (devis), l'appli ne calcule aucun prix.
class BookingFlowScreen extends ConsumerStatefulWidget {
  const BookingFlowScreen({super.key, required this.id, this.initialRange, this.initialGuests, this.initialRoom});

  final int id;

  /// Dates, voyageurs et chambre déjà connus (lien de Bo, recherche) : le voyageur n'a plus qu'à vérifier.
  final DateTimeRange? initialRange;
  final int? initialGuests;
  final int? initialRoom;

  @override
  ConsumerState<BookingFlowScreen> createState() => _BookingFlowScreenState();
}

class _BookingFlowScreenState extends ConsumerState<BookingFlowScreen> {
  static const _steps = 3;
  final _form = GlobalKey<FormState>();
  final _phone = TextEditingController();
  final _country = TextEditingController();
  final _requests = TextEditingController();
  final _travelerName = TextEditingController();
  final _travelerPhone = TextEditingController();
  final _code = TextEditingController();

  int _step = 0;
  DateTimeRange? _range;
  int _adults = 2;
  int _children = 0;
  int? _roomId;
  bool _forOther = false;
  TimeOfDay? _arrival;
  String? _appliedCode;
  bool _prefilled = false;
  bool _busy = false;
  String? _error;
  CreatedBooking? _created;
  String? _hostName;

  @override
  void initState() {
    super.initState();
    _range = widget.initialRange;
    _roomId = widget.initialRoom;
    if (widget.initialGuests != null && widget.initialGuests! > 0) _adults = widget.initialGuests!;
  }

  @override
  void dispose() {
    for (final c in [_phone, _country, _requests, _travelerName, _travelerPhone, _code]) {
      c.dispose();
    }
    super.dispose();
  }

  String get _here => '/accommodations/${widget.id}/book';

  DateTime _day(DateTime d) => DateTime(d.year, d.month, d.day);

  QuoteParams? _params() => _range == null ? null : QuoteParams(accommodationId: widget.id, checkIn: _day(_range!.start), checkOut: _day(_range!.end), roomId: _roomId, referralCode: _appliedCode);

  Future<void> _pickDates() async {
    final today = _day(DateTime.now());
    final picked = await showDateRangePicker(
      context: context,
      firstDate: today,
      lastDate: today.add(const Duration(days: 365)),
      initialDateRange: _range,
      helpText: AppLocalizations.of(context).bookDatesPick,
    );
    if (picked != null && mounted) setState(() => _range = DateTimeRange(start: _day(picked.start), end: _day(picked.end)));
  }

  Future<void> _pickArrival() async {
    final picked = await showTimePicker(context: context, initialTime: _arrival ?? const TimeOfDay(hour: 14, minute: 0));
    if (picked != null && mounted) setState(() => _arrival = picked);
  }

  void _back() {
    if (_created != null) return;
    if (_step > 0) {
      setState(() => _step--);
    } else {
      context.canPop() ? context.pop() : context.go('/accommodations/${widget.id}');
    }
  }

  void _next() {
    if (_step == 1 && !(_form.currentState?.validate() ?? false)) return;
    setState(() {
      _step++;
      _error = null;
    });
  }

  Future<void> _submit(AccommodationDetail a) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final created = await ref.read(bookingRepositoryProvider).create(BookingRequest(
            accommodationId: widget.id,
            roomId: _roomId,
            checkIn: _day(_range!.start),
            checkOut: _day(_range!.end),
            guests: _adults + _children,
            children: _children,
            phone: internationalPhone(_phone.text),
            residenceCountry: _country.text.trim(),
            arrivalTime: _arrival == null ? null : '${_arrival!.hour.toString().padLeft(2, '0')}:${_arrival!.minute.toString().padLeft(2, '0')}',
            specialRequests: _requests.text,
            referralCode: _appliedCode,
            forThirdParty: _forOther,
            travelerName: _forOther ? _travelerName.text : null,
            travelerPhone: _forOther ? internationalPhone(_travelerPhone.text) : null,
          ));
      if (mounted) {
        setState(() {
          _busy = false;
          _created = created;
          _hostName = a.name;
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
    final auth = ref.watch(authControllerProvider);
    final detail = ref.watch(accommodationDetailProvider(widget.id));
    final user = auth.value;

    if (user != null && !_prefilled) {
      _prefilled = true;
      if (_phone.text.isEmpty && (user.phone ?? '').isNotEmpty) _phone.text = user.phone!;
      if (_country.text.isEmpty) _country.text = l10n.bookCountryDefault;
    }

    return PopScope(
      canPop: _step == 0 || _created != null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _back();
      },
      child: Scaffold(
        appBar: AppBar(
          automaticallyImplyLeading: false,
          leading: _created != null ? null : IconButton(key: const Key('book-back'), tooltip: l10n.authBack, icon: const Icon(Icons.arrow_back_rounded), onPressed: _back),
          title: _created != null || user == null ? Text(l10n.bookTitle) : _Progress(step: _step, total: _steps),
        ),
        body: auth.isLoading
            ? const Center(child: CircularProgressIndicator(color: Brand.red))
            : user == null
                ? _Gate(next: _here)
                : detail.when(
                    loading: () => const Padding(padding: EdgeInsets.all(20), child: Skeleton(height: 220, radius: 20)),
                    error: (e, _) => ErrorView(message: errorText(e, l10n), onRetry: () => ref.invalidate(accommodationDetailProvider(widget.id))),
                    data: (a) {
                      _roomId ??= a.rooms.isEmpty ? null : a.rooms.first.id;

                      return _created != null ? _Sent(hostName: _hostName ?? a.name) : _body(a);
                    },
                  ),
      ),
    );
  }

  Widget _body(AccommodationDetail a) {
    final l10n = AppLocalizations.of(context);

    return SafeArea(
      child: Column(children: [
        Expanded(
          child: SingleChildScrollView(
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: switch (_step) {
              0 => _stay(a),
              1 => _who(),
              _ => _summary(a),
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
          child: _step < _steps - 1
              ? FilledButton(key: const Key('book-next'), onPressed: _step == 0 && _range == null ? null : _next, child: Text(l10n.bookNext))
              : _submitButton(a),
        ),
      ]),
    );
  }

  Widget _submitButton(AccommodationDetail a) {
    final l10n = AppLocalizations.of(context);
    final quote = _params() == null ? null : ref.watch(priceQuoteProvider(_params()!));
    final ready = quote?.hasValue == true;

    return Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      if (_error != null) AuthErrorBanner(_error!),
      FilledButton(
        key: const Key('book-submit'),
        onPressed: _busy || !ready ? null : () => _submit(a),
        child: _busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white)) : Text(l10n.bookSubmit),
      ),
    ]);
  }

  // ───── Étape 1 : le séjour ─────

  Widget _stay(AccommodationDetail a) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final loc = MaterialLocalizations.of(context);
    final room = a.rooms.where((r) => r.id == _roomId).firstOrNull;
    final maxGuests = room?.capacity ?? a.maxGuests ?? 12;
    final total = _adults + _children;

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(l10n.bookStayTitle, style: theme.textTheme.headlineMedium),
      const SizedBox(height: 4),
      Text(l10n.bookStaySubtitle, style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted)),
      const SizedBox(height: 18),
      _HotelCard(a: a),
      const SizedBox(height: 14),
      _Tappable(
        key: const Key('book-dates'),
        icon: Icons.calendar_month_outlined,
        label: l10n.bookDates,
        value: _range == null ? l10n.bookDatesPick : l10n.bookDatesValue(loc.formatMediumDate(_range!.start), loc.formatMediumDate(_range!.end), _range!.duration.inDays),
        onTap: _pickDates,
      ),
      const SizedBox(height: 10),
      _Counter(key: const Key('book-adults'), icon: Icons.people_outline_rounded, label: l10n.bookAdults, value: _adults, min: 1, max: maxGuests - _children, onChanged: (v) => setState(() => _adults = v)),
      const SizedBox(height: 10),
      _Counter(key: const Key('book-children'), icon: Icons.child_care_outlined, label: l10n.bookChildren, value: _children, min: 0, max: maxGuests - _adults, onChanged: (v) => setState(() => _children = v)),
      if (total >= maxGuests) Padding(padding: const EdgeInsets.only(top: 8, left: 4), child: Text(l10n.bookTooManyGuests('$maxGuests'), style: theme.textTheme.bodySmall)),
      if (a.rooms.length > 1) ...[
        const SizedBox(height: 18),
        Text(l10n.bookRoom, style: theme.textTheme.titleMedium),
        const SizedBox(height: 8),
        for (final r in a.rooms) ...[
          _RoomChoice(room: r, selected: r.id == _roomId, onTap: () => setState(() {
                _roomId = r.id;
                final cap = r.capacity;
                if (cap != null && _adults + _children > cap) {
                  _children = 0;
                  _adults = cap;
                }
              })),
          const SizedBox(height: 8),
        ],
      ],
    ]);
  }

  // ───── Étape 2 : qui voyage ─────

  Widget _who() {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    String? required(String? v) => (v ?? '').trim().isEmpty ? l10n.bookFieldRequired : null;

    return Form(
      key: _form,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Text(l10n.bookWhoTitle, style: theme.textTheme.headlineMedium),
        const SizedBox(height: 4),
        Text(l10n.bookWhoSubtitle, style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted)),
        const SizedBox(height: 18),
        _Choice(key: const Key('book-who-me'), icon: Icons.person_outline_rounded, title: l10n.bookWhoMe, subtitle: ref.read(authControllerProvider).value?.name ?? '', selected: !_forOther, onTap: () => setState(() => _forOther = false)),
        const SizedBox(height: 10),
        _Choice(key: const Key('book-who-other'), icon: Icons.group_outlined, title: l10n.bookWhoOther, subtitle: l10n.bookWhoOtherSub, selected: _forOther, onTap: () => setState(() => _forOther = true)),
        if (_forOther) ...[
          const SizedBox(height: 14),
          _Labeled(l10n.bookTravelerName, TextFormField(key: const Key('book-traveler-name'), controller: _travelerName, textCapitalization: TextCapitalization.words, validator: required)),
          const SizedBox(height: 12),
          _Labeled(l10n.bookTravelerPhone, TextFormField(key: const Key('book-traveler-phone'), controller: _travelerPhone, keyboardType: TextInputType.phone, validator: (v) => phoneDigits(v ?? '') < 8 ? l10n.bookFieldRequired : null)),
        ],
        const SizedBox(height: 14),
        _Labeled(l10n.bookPhone, TextFormField(key: const Key('book-phone'), controller: _phone, keyboardType: TextInputType.phone, validator: (v) => phoneDigits(v ?? '') < 8 ? l10n.bookFieldRequired : null)),
        const SizedBox(height: 12),
        _Labeled(l10n.bookCountry, TextFormField(key: const Key('book-country'), controller: _country, textCapitalization: TextCapitalization.words, validator: required)),
        const SizedBox(height: 12),
        _Tappable(
          key: const Key('book-arrival'),
          icon: Icons.schedule_rounded,
          label: l10n.bookArrival,
          value: _arrival == null ? l10n.bookArrivalNone : _arrival!.format(context),
          onTap: _pickArrival,
        ),
        const SizedBox(height: 12),
        _Labeled(l10n.bookRequests, TextFormField(key: const Key('book-requests'), controller: _requests, minLines: 2, maxLines: 4, maxLength: 1000, decoration: const InputDecoration(counterText: ''))),
      ]),
    );
  }

  // ───── Étape 3 : récapitulatif (devis du serveur) ─────

  Widget _summary(AccommodationDetail a) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = Localizations.localeOf(context).languageCode;
    final loc = MaterialLocalizations.of(context);
    final params = _params()!;
    final quote = ref.watch(priceQuoteProvider(params));
    String money(num n) => '${formatFcfa(n, lang)} FCFA';

    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Text(l10n.bookSummaryTitle, style: theme.textTheme.headlineMedium),
      const SizedBox(height: 4),
      Text(l10n.bookSummarySubtitle, style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted)),
      const SizedBox(height: 18),
      _HotelCard(a: a, subtitle: l10n.bookDatesValue(loc.formatMediumDate(_range!.start), loc.formatMediumDate(_range!.end), _range!.duration.inDays)),
      const SizedBox(height: 14),
      quote.when(
        loading: () => const Skeleton(height: 150),
        error: (e, _) => ErrorView(message: errorText(e, l10n), onRetry: () => ref.invalidate(priceQuoteProvider(params)), compact: true),
        data: (q) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Container(
            key: const Key('book-quote'),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: Brand.border)),
            child: Column(children: [
              _Line(l10n.bookStayLine(money(q.pricePerNight), q.nights), money(q.pricePerNight * q.nights)),
              if (q.longStay != null && q.longStay!.amount > 0) _Line(q.longStay!.label, '− ${money(q.longStay!.amount)}', green: true),
              if (q.referralAmount > 0) _Line(l10n.bookReferralApplied(q.referral?.label?.replaceFirst('Invitation de ', '') ?? '', formatFcfa(q.referralAmount, lang)), '− ${money(q.referralAmount)}', green: true),
              const Divider(height: 18),
              _Line(l10n.bookTotal, money(q.payable), bold: true),
            ]),
          ),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: TextField(key: const Key('book-code'), controller: _code, textCapitalization: TextCapitalization.characters, decoration: InputDecoration(hintText: l10n.bookReferralCode, prefixIcon: const Icon(Icons.card_giftcard_rounded)))),
            const SizedBox(width: 10),
            FilledButton(
              key: const Key('book-code-apply'),
              onPressed: () => setState(() => _appliedCode = _code.text.trim().isEmpty ? null : _code.text.trim().toUpperCase()),
              style: FilledButton.styleFrom(minimumSize: const Size(0, 54), padding: const EdgeInsets.symmetric(horizontal: 18), backgroundColor: Brand.black),
              child: Text(l10n.bookReferralApply),
            ),
          ]),
          if (q.referral?.error != null) Padding(padding: const EdgeInsets.only(top: 8, left: 4), child: Text(q.referral!.error!, key: const Key('book-code-error'), style: theme.textTheme.bodySmall?.copyWith(color: Brand.redDark))),
          const SizedBox(height: 14),
          _PayInfo(quote: q),
        ]),
      ),
    ]);
  }
}

class _Progress extends StatelessWidget {
  const _Progress({required this.step, required this.total});

  final int step;
  final int total;

  @override
  Widget build(BuildContext context) => Row(children: [
        for (var i = 0; i < total; i++)
          Expanded(child: AnimatedContainer(duration: const Duration(milliseconds: 250), height: 5, margin: EdgeInsets.only(right: i < total - 1 ? 6 : 0), decoration: BoxDecoration(color: i <= step ? Brand.black : const Color(0xFFE3E1DA), borderRadius: BorderRadius.circular(3)))),
        const SizedBox(width: 12),
      ]);
}

class _Gate extends StatelessWidget {
  const _Gate({required this.next});

  final String next;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final encoded = Uri.encodeQueryComponent(next);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const CircleAvatar(radius: 38, backgroundColor: Brand.black, child: Icon(Icons.lock_outline_rounded, color: Colors.white, size: 34)),
          const SizedBox(height: 20),
          Text(l10n.bookGateTitle, textAlign: TextAlign.center, style: theme.textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text(l10n.bookGateText, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted)),
          const SizedBox(height: 24),
          FilledButton(key: const Key('gate-login'), onPressed: () => context.push('/auth/login?next=$encoded'), child: Text(l10n.loginSubmit)),
          const SizedBox(height: 10),
          OutlinedButton(key: const Key('gate-register'), onPressed: () => context.push('/auth/register?next=$encoded'), child: Text(l10n.loginCreate)),
        ]),
      ),
    );
  }
}

class _HotelCard extends StatelessWidget {
  const _HotelCard({required this.a, this.subtitle});

  final AccommodationDetail a;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: Brand.border)),
      child: Row(children: [
        ClipRRect(borderRadius: BorderRadius.circular(14), child: SizedBox(width: 72, height: 72, child: RemoteImage(url: a.images.firstOrNull))),
        const SizedBox(width: 12),
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(a.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleMedium),
            Text(subtitle ?? a.city, style: theme.textTheme.bodySmall),
          ]),
        ),
      ]),
    );
  }
}

class _Tappable extends StatelessWidget {
  const _Tappable({super.key, required this.icon, required this.label, required this.value, required this.onTap});

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: Brand.surfaceMuted,
      borderRadius: BorderRadius.circular(20),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(children: [
            Icon(icon, color: Brand.red),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(label, style: theme.textTheme.bodySmall), Text(value, style: theme.textTheme.titleMedium)])),
            const Icon(Icons.chevron_right_rounded, color: Brand.textMuted),
          ]),
        ),
      ),
    );
  }
}

class _Counter extends StatelessWidget {
  const _Counter({super.key, required this.icon, required this.label, required this.value, required this.min, required this.max, required this.onChanged});

  final IconData icon;
  final String label;
  final int value;
  final int min;
  final int max;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Widget button(IconData i, bool enabled, VoidCallback onTap, String key) => IconButton.outlined(key: Key(key), onPressed: enabled ? onTap : null, icon: Icon(i, size: 18), style: IconButton.styleFrom(side: const BorderSide(color: Brand.border), minimumSize: const Size(40, 40)));

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(20)),
      child: Row(children: [
        Icon(icon, color: Brand.red),
        const SizedBox(width: 14),
        Expanded(child: Text(label, style: theme.textTheme.titleMedium)),
        button(Icons.remove_rounded, value > min, () => onChanged(value - 1), '$label-moins'),
        SizedBox(width: 38, child: Text('$value', textAlign: TextAlign.center, style: theme.textTheme.titleMedium)),
        button(Icons.add_rounded, value < max, () => onChanged(value + 1), '$label-plus'),
      ]),
    );
  }
}

class _RoomChoice extends StatelessWidget {
  const _RoomChoice({required this.room, required this.selected, required this.onTap});

  final RoomInfo room;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = Localizations.localeOf(context).languageCode;

    return InkWell(
      key: Key('room-${room.id}'),
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: selected ? Colors.white : Brand.surfaceMuted, borderRadius: BorderRadius.circular(20), border: Border.all(color: selected ? Brand.black : Colors.transparent, width: 1.6)),
        child: Row(children: [
          ClipRRect(borderRadius: BorderRadius.circular(12), child: SizedBox(width: 60, height: 60, child: RemoteImage(url: room.imageUrl))),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(room.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleMedium),
              if (room.capacity != null) Text(l10n.bookRoomCapacity(room.capacity!), style: theme.textTheme.bodySmall),
              Text(l10n.detailFromPerNight(formatFcfa(room.pricePerNight, lang)), style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
            ]),
          ),
          Icon(selected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded, color: selected ? Brand.black : const Color(0xFFC9C6BD)),
        ]),
      ),
    );
  }
}

class _Choice extends StatelessWidget {
  const _Choice({super.key, required this.icon, required this.title, required this.subtitle, required this.selected, required this.onTap});

  final IconData icon;
  final String title;
  final String subtitle;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      borderRadius: BorderRadius.circular(20),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: selected ? Colors.white : Brand.surfaceMuted, borderRadius: BorderRadius.circular(20), border: Border.all(color: selected ? Brand.black : Colors.transparent, width: 1.6)),
        child: Row(children: [
          CircleAvatar(backgroundColor: selected ? Brand.red : Brand.black, child: Icon(icon, color: Colors.white)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: theme.textTheme.titleMedium), if (subtitle.isNotEmpty) Text(subtitle, style: theme.textTheme.bodySmall)])),
          Icon(selected ? Icons.check_circle_rounded : Icons.radio_button_unchecked_rounded, color: selected ? Brand.black : const Color(0xFFC9C6BD)),
        ]),
      ),
    );
  }
}

class _Labeled extends StatelessWidget {
  const _Labeled(this.label, this.child);

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(padding: const EdgeInsets.only(bottom: 8, left: 4), child: Text(label, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700))),
        child,
      ]);
}

class _Line extends StatelessWidget {
  const _Line(this.label, this.value, {this.bold = false, this.green = false});

  final String label;
  final String value;
  final bool bold;
  final bool green;

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodyLarge?.copyWith(fontWeight: bold ? FontWeight.w800 : (green ? FontWeight.w700 : FontWeight.w400), color: green ? const Color(0xFF0E7A4B) : Brand.black, fontSize: bold ? 17 : 15);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: Text(label, style: style)), const SizedBox(width: 12), Text(value, style: style)]),
    );
  }
}

/// Ce que le voyageur paiera après la confirmation de l'hôte, d'après les montants du serveur.
class _PayInfo extends StatelessWidget {
  const _PayInfo({required this.quote});

  final PriceQuote quote;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = Localizations.localeOf(context).languageCode;
    final full = quote.full;
    final guarantee = quote.guarantee;
    if (full == null && guarantee == null) return const SizedBox.shrink();

    return Container(
      key: const Key('book-pay-info'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Brand.beige, borderRadius: BorderRadius.circular(20)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(l10n.bookPayLater, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        if (full != null)
          Text(
            quote.fullOnly || guarantee == null || (full.discountPercent ?? 0) <= 0 ? l10n.bookPayFullOnly(formatFcfa(full.amount, lang)) : l10n.bookPayNowFull(formatFcfa(full.amount, lang), '${full.discountPercent}'),
            style: theme.textTheme.bodyMedium,
          ),
        if (!quote.fullOnly && guarantee != null) Text(l10n.bookPayGuarantee(formatFcfa(guarantee.amount, lang)), style: theme.textTheme.bodyMedium),
      ]),
    );
  }
}

class _Sent extends ConsumerWidget {
  const _Sent({required this.hostName});

  final String hostName;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final steps = [
      (l10n.bookSentStep1, null, true),
      (l10n.bookSentStep2, l10n.bookSentStep2Sub, false),
      (l10n.bookSentStep3, l10n.bookSentStep3Sub, false),
      (l10n.bookSentStep4, l10n.bookSentStep4Sub, false),
    ];

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          const SizedBox(height: 24),
          Center(
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: const Duration(milliseconds: 700),
              curve: Curves.elasticOut,
              builder: (_, v, child) => Transform.scale(scale: v, child: child),
              child: Container(width: 96, height: 96, decoration: const BoxDecoration(color: Color(0xFFDFF3EA), shape: BoxShape.circle), child: const Icon(Icons.send_rounded, size: 42, color: Color(0xFF0E7A4B))),
            ),
          ),
          const SizedBox(height: 20),
          Text(l10n.bookSentTitle, key: const Key('book-sent'), textAlign: TextAlign.center, style: theme.textTheme.headlineMedium),
          const SizedBox(height: 8),
          Text(l10n.bookSentText(hostName), textAlign: TextAlign.center, style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted)),
          const SizedBox(height: 22),
          for (var i = 0; i < steps.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                CircleAvatar(radius: 12, backgroundColor: steps[i].$3 ? const Color(0xFF0E7A4B) : (i == 1 ? Brand.red : const Color(0xFFE3E1DA)), child: steps[i].$3 ? const Icon(Icons.check_rounded, size: 14, color: Colors.white) : null),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(steps[i].$1, style: theme.textTheme.titleMedium), if (steps[i].$2 != null) Text(steps[i].$2!, style: theme.textTheme.bodySmall)])),
              ]),
            ),
          const Spacer(),
          FilledButton(key: const Key('sent-bookings'), onPressed: () {
            ref.invalidate(myBookingsProvider);
            context.go('/bookings');
          }, child: Text(l10n.bookSentBookings)),
          const SizedBox(height: 10),
          OutlinedButton(onPressed: () => context.go('/'), child: Text(l10n.bookSentHome)),
        ]),
      ),
    );
  }
}
