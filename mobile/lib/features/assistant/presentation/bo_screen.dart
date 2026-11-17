import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/bo_orb.dart';
import '../../accommodations/presentation/accommodation_card.dart';
import '../../auth/presentation/auth_controller.dart';
import '../data/assistant_repository.dart';
import '../domain/bo_models.dart';
import 'assistant_controller.dart';

/// Conversation avec Bo, l'assistant de séjour. Mêmes couleurs et même orbe que sur le site :
/// pastilles noires et grises, rouge boséjour pour les accents, orbe noire aux yeux rouges.
class BoScreen extends ConsumerStatefulWidget {
  const BoScreen({super.key});

  @override
  ConsumerState<BoScreen> createState() => _BoScreenState();
}

class _BoScreenState extends ConsumerState<BoScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _send(String text) {
    FocusScope.of(context).unfocus();
    _input.clear();
    ref.read(boChatProvider.notifier).ask(text);
  }

  void _scrollToEnd() => WidgetsBinding.instance.addPostFrameCallback((_) {
        if (_scroll.hasClients) _scroll.animateTo(_scroll.position.maxScrollExtent, duration: const Duration(milliseconds: 250), curve: Curves.easeOut);
      });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final chat = ref.watch(boChatProvider);
    final user = ref.watch(authControllerProvider).value;
    final settings = ref.watch(aiSettingsProvider).value ?? const AiSettings();
    final isTraveler = user?.isTraveler ?? false;
    final mustLogIn = !isTraveler && !settings.guestsAllowed;
    final state = chat.loading ? BoState.thinking : (chat.activeOffers.isNotEmpty ? BoState.found : BoState.idle);

    ref.listen(boChatProvider, (_, _) => _scrollToEnd());

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        leading: IconButton(key: const Key('bo-close'), tooltip: l10n.boClose, icon: const Icon(Icons.arrow_back_rounded), onPressed: () => context.canPop() ? context.pop() : context.go('/')),
        title: Row(children: [
          BoOrb(size: 40, state: state),
          const SizedBox(width: 12),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(l10n.boName, style: theme.textTheme.titleMedium),
              Row(children: [
                Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFF059669), shape: BoxShape.circle)),
                const SizedBox(width: 6),
                Text(l10n.boSubtitle, style: theme.textTheme.bodySmall),
              ]),
            ]),
          ),
        ]),
        actions: [
          if (chat.messages.isNotEmpty)
            IconButton(key: const Key('bo-restart'), tooltip: l10n.boNewChat, icon: const Icon(Icons.refresh_rounded), onPressed: chat.loading ? null : () => ref.read(boChatProvider.notifier).restart()),
        ],
        shape: const Border(bottom: BorderSide(color: Brand.border)),
      ),
      body: mustLogIn
          ? _LoginRequired(onLogin: () => context.go('/account'))
          : Column(children: [
              Expanded(
                child: chat.messages.isEmpty
                    ? _Welcome(isTraveler: isTraveler, onAsk: _send, onLogin: () => context.go('/account'))
                    : _Conversation(chat: chat, scroll: _scroll, onOffer: (o) => context.push('/accommodations/${o.id}'), onLogin: () => context.go('/account')),
              ),
              _Composer(controller: _input, busy: chat.loading, onSend: _send),
            ]),
    );
  }
}

class _LoginRequired extends StatelessWidget {
  const _LoginRequired({required this.onLogin});

  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const BoOrb(size: 120, shadow: true),
          const SizedBox(height: 16),
          Text(l10n.boLoginRequired, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyLarge),
          const SizedBox(height: 20),
          FilledButton(key: const Key('bo-login'), onPressed: onLogin, style: FilledButton.styleFrom(minimumSize: const Size(200, 50)), child: Text(l10n.boLogin)),
        ]),
      ),
    );
  }
}

/// Écran d'accueil de Bo : grande orbe, salutation en écriture manuscrite rouge, quatre pastilles de départ.
class _Welcome extends StatelessWidget {
  const _Welcome({required this.isTraveler, required this.onAsk, required this.onLogin});

  final bool isTraveler;
  final ValueChanged<String> onAsk;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final tiles = <(IconData, String, VoidCallback)>[
      (Icons.bed_outlined, l10n.boTileHotel, () => onAsk(l10n.boTileHotelQuestion)),
      (Icons.park_outlined, l10n.boTileWeekend, () => onAsk(l10n.boTileWeekendQuestion)),
      (Icons.home_outlined, l10n.boTileResidence, () => onAsk(l10n.boTileResidenceQuestion)),
      (Icons.event_available_outlined, l10n.boTileBookings, isTraveler ? () => onAsk(l10n.boTileBookingsQuestion) : onLogin),
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
      child: Column(children: [
        const BoOrb(size: 132, shadow: true),
        const SizedBox(height: 8),
        Text(l10n.boHello, style: const TextStyle(fontFamily: Brand.fontSlogan, fontSize: 34, color: Brand.red)),
        const SizedBox(height: 4),
        Text(l10n.boIntroTitle, textAlign: TextAlign.center, style: theme.textTheme.titleLarge),
        const SizedBox(height: 8),
        ConstrainedBox(constraints: const BoxConstraints(maxWidth: 320), child: Text(l10n.boIntroText, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted))),
        const SizedBox(height: 22),
        GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 10,
          crossAxisSpacing: 10,
          childAspectRatio: 1.55,
          children: [for (final t in tiles) _Tile(icon: t.$1, label: t.$2, onTap: t.$3)],
        ),
      ]),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: Brand.border)),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Icon(icon, color: Brand.red),
              Text(label, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontSize: 14.5, height: 1.2)),
            ]),
          ),
        ),
      );
}

class _Conversation extends StatelessWidget {
  const _Conversation({required this.chat, required this.scroll, required this.onOffer, required this.onLogin});

  final BoChatState chat;
  final ScrollController scroll;
  final ValueChanged<BoOffer> onOffer;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lastAssistant = chat.messages.lastIndexWhere((m) => m.role == BoRole.assistant);

    return ListView(
      controller: scroll,
      padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
      children: [
        Center(child: Text(l10n.boToday(chat.startedAt), style: theme.textTheme.bodySmall)),
        const SizedBox(height: 12),
        for (var i = 0; i < chat.messages.length; i++) ...[
          _Bubble(message: chat.messages[i], onLogin: onLogin),
          if (chat.messages[i].offers.isNotEmpty && i == lastAssistant && !chat.loading)
            _Offers(offers: chat.messages[i].offers, selectedId: chat.selectedId, onOpen: onOffer),
          const SizedBox(height: 10),
        ],
        if (chat.loading) const _TypingBubble(),
      ],
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({required this.message, required this.onLogin});

  final BoMessage message;
  final VoidCallback onLogin;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final user = message.role == BoRole.user;

    final bubble = Container(
      constraints: BoxConstraints(maxWidth: MediaQuery.sizeOf(context).width * (user ? 0.82 : 0.78)),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
      decoration: BoxDecoration(
        color: user ? Brand.black : (message.local ? const Color(0xFFFFFBEB) : Brand.surfaceMuted),
        borderRadius: BorderRadius.only(topLeft: const Radius.circular(20), topRight: const Radius.circular(20), bottomLeft: Radius.circular(user ? 20 : 6), bottomRight: Radius.circular(user ? 6 : 20)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisSize: MainAxisSize.min, children: [
        Text(message.text, style: theme.textTheme.bodyMedium?.copyWith(color: user ? Colors.white : (message.local ? const Color(0xFF78350F) : Brand.black), height: 1.4)),
        if (message.loginRequired) ...[
          const SizedBox(height: 8),
          FilledButton(onPressed: onLogin, style: FilledButton.styleFrom(minimumSize: const Size(0, 38), padding: const EdgeInsets.symmetric(horizontal: 18)), child: Text(l10n.boLogin)),
        ],
      ]),
    );

    if (user) return Align(alignment: Alignment.centerRight, child: bubble);

    return Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
      const Padding(padding: EdgeInsets.only(right: 8, bottom: 4), child: BoOrb(size: 24)),
      Flexible(child: bubble),
    ]);
  }
}

class _TypingBubble extends StatelessWidget {
  const _TypingBubble();

  @override
  Widget build(BuildContext context) => Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        const Padding(padding: EdgeInsets.only(right: 8, bottom: 4), child: BoOrb(size: 24, state: BoState.thinking)),
        Container(
          key: const Key('bo-typing'),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
          decoration: const BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.only(topLeft: Radius.circular(20), topRight: Radius.circular(20), bottomRight: Radius.circular(20), bottomLeft: Radius.circular(6))),
          child: const _Dots(),
        ),
      ]);
}

class _Dots extends StatefulWidget {
  const _Dots();

  @override
  State<_Dots> createState() => _DotsState();
}

class _DotsState extends State<_Dots> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100));
  bool _on = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (!reduce && !_on) {
      _c.repeat();
      _on = true;
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  /// Opacité du point n : pulsation de 1,1 s, chaque point en retard de 0,18 s sur le précédent.
  double _alpha(int i) {
    final phase = (((_c.value * 1100 - i * 180) % 1100) + 1100) % 1100 / 1100;

    return 0.25 + 0.75 * (phase < 0.4 ? phase / 0.4 : (1 - (phase - 0.4) / 0.6));
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: _c,
        builder: (_, _) => Row(mainAxisSize: MainAxisSize.min, children: [
          for (var i = 0; i < 3; i++)
            Container(
              width: 7,
              height: 7,
              margin: const EdgeInsets.symmetric(horizontal: 2.5),
              decoration: BoxDecoration(color: Brand.grayGreen.withValues(alpha: _on ? _alpha(i) : 0.6), shape: BoxShape.circle),
            ),
        ]),
      );
}

/// Hébergements trouvés par Bo, en cartes défilantes. La première porte le badge « Choix de Bo ».
class _Offers extends StatelessWidget {
  const _Offers({required this.offers, required this.selectedId, required this.onOpen});

  final List<BoOffer> offers;
  final int? selectedId;
  final ValueChanged<BoOffer> onOpen;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 10, left: 32),
        child: SizedBox(
          height: 240,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: offers.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (_, i) => _OfferCard(key: Key('bo-offer-${offers[i].id}'), offer: offers[i], favorite: i == 0, selected: offers[i].id == selectedId, onOpen: () => onOpen(offers[i])),
          ),
        ),
      );
}

class _OfferCard extends ConsumerWidget {
  const _OfferCard({super.key, required this.offer, required this.favorite, required this.selected, required this.onOpen});

  final BoOffer offer;
  final bool favorite;
  final bool selected;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = Localizations.localeOf(context).languageCode;
    final o = offer;

    return GestureDetector(
      onTap: () => ref.read(boChatProvider.notifier).select(o.id),
      child: Container(
        width: 248,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: selected ? Brand.red : Brand.border, width: 2)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
            height: 108,
            width: double.infinity,
            child: Stack(fit: StackFit.expand, children: [
              RemoteImage(url: o.photo),
              if (favorite)
                Positioned(
                  left: 10,
                  top: 10,
                  child: Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5), decoration: BoxDecoration(color: Brand.red, borderRadius: BorderRadius.circular(20)), child: Text(l10n.boChoice, style: const TextStyle(fontFamily: Brand.fontText, color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700))),
                ),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(o.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleMedium?.copyWith(fontSize: 14.5)),
              const SizedBox(height: 4),
              Row(children: [
                const Icon(Icons.place_outlined, size: 14, color: Brand.red),
                const SizedBox(width: 3),
                Expanded(child: Text([o.city, accommodationTypeLabel(l10n, o.type)].whereType<String>().join(' · '), maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.bodySmall)),
                if (o.rating != null && o.rating! > 0) ...[const Icon(Icons.star_rounded, size: 14, color: Color(0xFFF5A623)), Text(formatRating(o.rating!, lang), style: theme.textTheme.bodySmall)],
              ]),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(
                  child: o.pricePerNight != null && o.pricePerNight! > 0
                      ? Text.rich(TextSpan(children: [TextSpan(text: formatFcfa(o.pricePerNight!, lang), style: theme.textTheme.titleMedium?.copyWith(fontSize: 14.5)), TextSpan(text: ' FCFA / ${lang == 'en' ? 'night' : 'nuit'}', style: theme.textTheme.bodySmall)]), maxLines: 1, overflow: TextOverflow.ellipsis)
                      : Text(l10n.boPriceOnPage, style: theme.textTheme.bodySmall),
                ),
                FilledButton(
                  onPressed: onOpen,
                  style: FilledButton.styleFrom(minimumSize: const Size(0, 34), padding: const EdgeInsets.symmetric(horizontal: 14), textStyle: const TextStyle(fontFamily: Brand.fontText, fontSize: 12.5, fontWeight: FontWeight.w700)),
                  child: Text(l10n.boView),
                ),
              ]),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({required this.controller, required this.busy, required this.onSend});

  final TextEditingController controller;
  final bool busy;
  final ValueChanged<String> onSend;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);

    return Container(
      decoration: const BoxDecoration(color: Colors.white, border: Border(top: BorderSide(color: Brand.border))),
      padding: EdgeInsets.fromLTRB(12, 10, 12, 10 + MediaQuery.paddingOf(context).bottom),
      child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Expanded(
          child: TextField(
            key: const Key('bo-input'),
            controller: controller,
            enabled: !busy,
            minLines: 1,
            maxLines: 4,
            maxLength: 500,
            textInputAction: TextInputAction.send,
            onSubmitted: onSend,
            decoration: InputDecoration(hintText: l10n.boInputHint, counterText: '', contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14), border: OutlineInputBorder(borderRadius: BorderRadius.circular(26), borderSide: BorderSide.none), enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(26), borderSide: BorderSide.none)),
          ),
        ),
        const SizedBox(width: 8),
        IconButton.filled(
          key: const Key('bo-send'),
          tooltip: l10n.boSend,
          style: IconButton.styleFrom(backgroundColor: Brand.red, foregroundColor: Colors.white, minimumSize: const Size(50, 50)),
          onPressed: busy ? null : () => onSend(controller.text),
          icon: const Icon(Icons.arrow_upward_rounded),
        ),
      ]),
    );
  }
}

/// Bouton flottant « Demandez à Bo » : l'orbe seule, discrète, au-dessus de la barre d'onglets.
class BoLauncher extends ConsumerWidget {
  const BoLauncher({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final enabled = ref.watch(aiSettingsProvider).value?.enabled ?? false;
    final user = ref.watch(authControllerProvider).value;
    final staff = user != null && !user.isTraveler;
    if (!enabled || staff) return const SizedBox.shrink();

    return Semantics(
      button: true,
      label: l10n.boLauncher,
      child: GestureDetector(
        key: const Key('bo-launcher'),
        onTap: () => context.push('/bo'),
        child: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.35), blurRadius: 24, offset: const Offset(0, 10), spreadRadius: -8)], border: Border.all(color: Colors.black.withValues(alpha: 0.05))),
          child: const BoOrb(size: 46),
        ),
      ),
    );
  }
}
