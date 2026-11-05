import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/app_config.dart';
import '../../../core/error_text.dart';
import '../../../core/format.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/common.dart';
import '../data/accommodation_repository.dart';
import '../domain/accommodation_detail.dart';
import 'accommodation_card.dart';

const _starColor = Color(0xFFF5A623);

/// Fiche d'un établissement : photos, informations clés, équipements, chambres, garantie, avis.
/// Tout ce qui touche au prix, à la garantie et à la disponibilité vient du serveur, l'appli ne calcule rien.
class AccommodationDetailScreen extends ConsumerWidget {
  const AccommodationDetailScreen({super.key, required this.id});

  final int id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context);
    final detail = ref.watch(accommodationDetailProvider(id));

    return detail.when(
      loading: () => const _Frame(child: _DetailSkeleton()),
      error: (error, _) {
        final notFound = error is ApiException && error.statusCode == 404;

        return _Frame(
          child: notFound
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(l10n.detailNotFound, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyLarge),
                  ),
                )
              : ErrorView(message: errorText(error, l10n), onRetry: () => ref.invalidate(accommodationDetailProvider(id))),
        );
      },
      data: (a) => _DetailView(a: a),
    );
  }
}

/// Contenu de la fiche. Le bouton retour reste en place pendant tout le défilement ; la barre d'état
/// du téléphone ne se superpose jamais au texte (bande blanche dès qu'on a quitté la photo).
class _DetailView extends StatefulWidget {
  const _DetailView({required this.a});

  final AccommodationDetail a;

  @override
  State<_DetailView> createState() => _DetailViewState();
}

class _DetailViewState extends State<_DetailView> {
  static const _galleryRatio = 4 / 3.4;

  final _controller = ScrollController();
  bool _pastGallery = false;

  @override
  void initState() {
    super.initState();
    _controller.addListener(_onScroll);
  }

  void _onScroll() {
    final galleryHeight = MediaQuery.sizeOf(context).width / _galleryRatio;
    final past = _controller.offset > galleryHeight - MediaQuery.paddingOf(context).top - 56;
    if (past != _pastGallery) setState(() => _pastGallery = past);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final a = widget.a;
    final top = MediaQuery.paddingOf(context).top;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      // Sur la photo (voile sombre) : heure et batterie en clair ; sur la bande blanche : en sombre.
      value: _pastGallery ? SystemUiOverlayStyle.dark : SystemUiOverlayStyle.light,
      child: Scaffold(
        body: Stack(
          children: [
            SingleChildScrollView(
              controller: _controller,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Gallery(images: a.images, aspectRatio: _galleryRatio),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _Header(a: a),
                        const SizedBox(height: 20),
                        _Highlights(a: a),
                        if (a.description != null)
                          _Section(
                            title: l10n.detailAbout,
                            child: _ExpandableText(text: a.description!),
                          ),
                        if (a.amenities.isNotEmpty || a.services.isNotEmpty)
                          _Section(
                            title: l10n.detailAmenities,
                            child: _Amenities(amenities: a.amenities, services: a.services),
                          ),
                        if (a.rooms.isNotEmpty)
                          _Section(
                            title: l10n.detailRooms,
                            child: Column(children: [for (final room in a.rooms) _RoomCard(room: room)]),
                          ),
                        _Section(
                          title: l10n.detailPolicies,
                          child: _Policies(a: a),
                        ),
                        _Section(
                          title: l10n.detailReviews,
                          child: _Reviews(a: a),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Positioned(
              top: 0,
              left: 0,
              right: 0,
              height: top + 56,
              child: IgnorePointer(
                child: AnimatedOpacity(
                  opacity: _pastGallery ? 1 : 0,
                  duration: const Duration(milliseconds: 180),
                  child: const DecoratedBox(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border(bottom: BorderSide(color: Brand.border)),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(top: top + 4, left: 8, child: const _BackButton()),
          ],
        ),
        bottomNavigationBar: _BookBar(a: a),
      ),
    );
  }
}

/// Cadre commun au chargement et à l'erreur : le bouton retour reste toujours disponible.
class _Frame extends StatelessWidget {
  const _Frame({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(leading: const _BackButton(onLightBackground: true)),
    body: child,
  );
}

class _BackButton extends StatelessWidget {
  const _BackButton({this.onLightBackground = false});

  final bool onLightBackground;

  @override
  Widget build(BuildContext context) {
    final label = AppLocalizations.of(context).detailBack;

    return Padding(
      padding: const EdgeInsets.all(6),
      child: Semantics(
        button: true,
        label: label,
        child: Material(
          color: onLightBackground ? Brand.surfaceMuted : Colors.white,
          shape: const CircleBorder(),
          elevation: onLightBackground ? 0 : 2,
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: () => context.canPop() ? context.pop() : context.go('/'),
            child: const SizedBox(width: 44, height: 44, child: Icon(Icons.arrow_back_rounded, color: Brand.black)),
          ),
        ),
      ),
    );
  }
}

class _Gallery extends StatefulWidget {
  const _Gallery({required this.images, required this.aspectRatio});

  final List<String> images;
  final double aspectRatio;

  @override
  State<_Gallery> createState() => _GalleryState();
}

class _GalleryState extends State<_Gallery> {
  int _page = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final images = widget.images;

    return AspectRatio(
      aspectRatio: widget.aspectRatio,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (images.isEmpty)
            const RemoteImage(url: null)
          else
            PageView.builder(
              itemCount: images.length,
              onPageChanged: (i) => setState(() => _page = i),
              itemBuilder: (_, i) => RemoteImage(url: images[i]),
            ),
          // Voile léger : l'heure et la batterie restent lisibles sur une photo claire.
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: MediaQuery.paddingOf(context).top + 24,
            child: IgnorePointer(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Colors.black.withValues(alpha: 0.35), Colors.transparent]),
                ),
              ),
            ),
          ),
          if (images.length > 1)
            Positioned(
              right: 16,
              bottom: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(20)),
                child: Text(
                  l10n.detailPhotoCounter(_page + 1, images.length),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.a});

  final AccommodationDetail a;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = Localizations.localeOf(context).languageCode;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          a.name,
          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700, color: Brand.black),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            const Icon(Icons.place_outlined, size: 18, color: Brand.red),
            const SizedBox(width: 4),
            Expanded(child: Text('${a.city} · ${accommodationTypeLabel(l10n, a.type)}', style: theme.textTheme.bodyMedium)),
          ],
        ),
        const SizedBox(height: 10),
        Wrap(
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: 12,
          runSpacing: 6,
          children: [
            if (a.starRating != null)
              Semantics(
                label: l10n.detailStars(a.starRating!),
                excludeSemantics: true,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [for (var i = 0; i < a.starRating!; i++) const Icon(Icons.star_rounded, size: 18, color: _starColor)],
                ),
              ),
            if (a.rating != null)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.star_rounded, size: 18, color: _starColor),
                  const SizedBox(width: 2),
                  Text(
                    formatRating(a.rating!, lang),
                    style: theme.textTheme.bodyMedium?.copyWith(color: Brand.black, fontWeight: FontWeight.w700),
                  ),
                  Text(' · ${l10n.exploreReviews(a.reviewCount)}', style: theme.textTheme.bodySmall),
                ],
              )
            else
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(20)),
                child: Text(
                  l10n.newBadge,
                  style: theme.textTheme.bodySmall?.copyWith(color: Brand.black, fontWeight: FontWeight.w700),
                ),
              ),
          ],
        ),
        if (a.address != null) ...[const SizedBox(height: 10), Text(a.address!, style: theme.textTheme.bodySmall)],
        if (a.hasLocation)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 44), alignment: Alignment.centerLeft),
              onPressed: () => launchUrl(Uri.https('www.google.com', '/maps/search/', {'api': '1', 'query': '${a.latitude},${a.longitude}'}), mode: LaunchMode.externalApplication),
              icon: const Icon(Icons.map_outlined, size: 18),
              label: Text(l10n.detailViewMap),
            ),
          ),
      ],
    );
  }
}

/// Informations qui décident d'une réservation, en un coup d'œil.
class _Highlights extends StatelessWidget {
  const _Highlights({required this.a});

  final AccommodationDetail a;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final items = <(IconData, String)>[
      if (a.maxGuests != null && a.maxGuests! > 0) (Icons.group_outlined, l10n.detailGuests(a.maxGuests!)),
      if (a.bedrooms != null && a.bedrooms! > 0) (Icons.bed_outlined, l10n.detailBedrooms(a.bedrooms!)),
      if (a.bathrooms != null && a.bathrooms! > 0) (Icons.bathtub_outlined, l10n.detailBathrooms(a.bathrooms!)),
      if (a.checkIn != null) (Icons.login_rounded, l10n.detailCheckIn(a.checkIn!)),
      if (a.checkOut != null) (Icons.logout_rounded, l10n.detailCheckOut(a.checkOut!)),
    ];
    if (items.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [for (final (icon, text) in items) _Pill(icon: icon, text: text)],
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(20)),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 18, color: Brand.grayGreen),
        const SizedBox(width: 6),
        Flexible(
          child: Text(
            text,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Brand.black, fontWeight: FontWeight.w500),
          ),
        ),
      ],
    ),
  );
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 28),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        child,
      ],
    ),
  );
}

class _ExpandableText extends StatefulWidget {
  const _ExpandableText({required this.text});

  final String text;

  @override
  State<_ExpandableText> createState() => _ExpandableTextState();
}

class _ExpandableTextState extends State<_ExpandableText> {
  static const _shortLength = 240;
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final long = widget.text.length > _shortLength;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.text, maxLines: long && !_expanded ? 5 : null, overflow: long && !_expanded ? TextOverflow.ellipsis : null, style: Theme.of(context).textTheme.bodyMedium?.copyWith(height: 1.5)),
        if (long)
          TextButton(
            style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(0, 44)),
            onPressed: () => setState(() => _expanded = !_expanded),
            child: Text(_expanded ? l10n.detailReadLess : l10n.detailReadMore),
          ),
      ],
    );
  }
}

IconData _amenityIcon(String name) {
  final n = name.toLowerCase();
  if (n.contains('wi-fi') || n.contains('wifi')) return Icons.wifi_rounded;
  if (n.contains('parking')) return Icons.local_parking_rounded;
  if (n.contains('clim')) return Icons.ac_unit_rounded;
  if (n.contains('piscine') || n.contains('pool')) return Icons.pool_rounded;
  if (n.contains('petit') || n.contains('breakfast')) return Icons.free_breakfast_outlined;
  if (n.contains('restaurant')) return Icons.restaurant_rounded;
  if (n.contains('bar')) return Icons.local_bar_outlined;
  if (n.contains('télé') || n.contains('tele') || n.contains('tv')) return Icons.tv_rounded;
  if (n.contains('lave') || n.contains('laundry')) return Icons.local_laundry_service_outlined;
  if (n.contains('terrasse') || n.contains('balcon')) return Icons.deck_outlined;
  if (n.contains('chambre') || n.contains('room')) return Icons.room_service_outlined;
  if (n.contains('bain')) return Icons.bathtub_outlined;
  if (n.contains('sport') || n.contains('gym')) return Icons.fitness_center_rounded;

  return Icons.check_circle_outline_rounded;
}

class _Amenities extends StatelessWidget {
  const _Amenities({required this.amenities, required this.services});

  final List<String> amenities;
  final Set<HotelService> services;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final serviceItems = <(IconData, String)>[
      for (final s in services)
        switch (s) {
          HotelService.reception24h => (Icons.support_agent_outlined, l10n.detailServiceReception24h),
          HotelService.shuttle => (Icons.airport_shuttle_outlined, l10n.detailServiceShuttle),
          HotelService.laundry => (Icons.local_laundry_service_outlined, l10n.detailServiceLaundry),
          HotelService.pets => (Icons.pets_outlined, l10n.detailServicePets),
          HotelService.smokingArea => (Icons.smoking_rooms_outlined, l10n.detailServiceSmoking),
          HotelService.breakfastIncluded => (Icons.free_breakfast_outlined, l10n.detailServiceBreakfast),
        },
    ];

    // « Petit-déjeuner inclus » dit déjà tout : on n'affiche pas aussi « Petit-déjeuner » seul.
    final shown = services.contains(HotelService.breakfastIncluded) ? amenities.where((n) => !n.toLowerCase().contains('petit')) : amenities;

    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final name in shown) _Pill(icon: _amenityIcon(name), text: name),
        for (final (icon, text) in serviceItems) _Pill(icon: icon, text: text),
      ],
    );
  }
}

class _RoomCard extends StatelessWidget {
  const _RoomCard({required this.room});

  final RoomInfo room;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = Localizations.localeOf(context).languageCode;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        border: Border.all(color: Brand.border),
        borderRadius: BorderRadius.circular(16),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 108, height: 124, child: RemoteImage(url: room.imageUrl)),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(room.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleMedium),
                  if (room.capacity != null && room.capacity! > 0) ...[const SizedBox(height: 2), Text(l10n.detailGuests(room.capacity!), style: theme.textTheme.bodySmall)],
                  if (room.amenities.isNotEmpty) ...[const SizedBox(height: 4), Text(room.amenities.take(3).join(' · '), maxLines: 2, overflow: TextOverflow.ellipsis, style: theme.textTheme.bodySmall)],
                  const SizedBox(height: 8),
                  Text(l10n.explorePerNight(formatFcfa(room.pricePerNight, lang)), style: theme.textTheme.titleMedium?.copyWith(color: Brand.black)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Garantie de réservation et annulation : ce que le voyageur doit savoir avant de payer.
class _Policies extends StatelessWidget {
  const _Policies({required this.a});

  final AccommodationDetail a;

  /// Même grille que sur le site : 0 h = stricte, jusqu'à 24 h = modérée, au-delà = flexible.
  String? _cancellation(AppLocalizations l10n) {
    final hours = a.cancellationHours;
    if (hours == null) return null;
    if (hours <= 0) return l10n.detailCancelStrict;

    return hours <= 24 ? l10n.detailCancelModerate(hours) : l10n.detailCancelFlexible(hours);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final cancellation = _cancellation(l10n);
    final guarantee = a.guarantee;
    var guaranteeText = guarantee?.description ?? guarantee?.summary;
    // Le texte du serveur commence souvent par le titre (« Garantie de réservation : … ») : on ne le répète pas.
    final prefix = guarantee == null ? null : '${guarantee.label} : ';
    if (guaranteeText != null && prefix != null && guaranteeText.startsWith(prefix) && guaranteeText.length > prefix.length) {
      final rest = guaranteeText.substring(prefix.length);
      guaranteeText = rest[0].toUpperCase() + rest.substring(1);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (guarantee != null) _Note(icon: Icons.verified_user_outlined, title: guarantee.label, text: guaranteeText),
        if (cancellation != null) _Note(icon: Icons.event_available_outlined, text: cancellation),
        if (a.specialConditions != null) _Note(icon: Icons.info_outline_rounded, title: l10n.detailSpecialConditions, text: a.specialConditions),
        if (guarantee == null && cancellation == null && a.specialConditions == null) Text('—', style: theme.textTheme.bodyMedium),
      ],
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, this.title, this.text});

  final IconData icon;
  final String? title;
  final String? text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(14)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 22, color: Brand.grayGreen),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (title != null) Text(title!, style: theme.textTheme.titleMedium),
                if (title != null && text != null) const SizedBox(height: 2),
                if (text != null) Text(text!, style: theme.textTheme.bodyMedium?.copyWith(height: 1.45)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Reviews extends StatelessWidget {
  const _Reviews({required this.a});

  final AccommodationDetail a;

  /// Les derniers avis suffisent sur mobile ; le reste se lit sur le site.
  static const _shown = 5;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    if (a.reviews.isEmpty) return Text(l10n.detailNoReviews, style: Theme.of(context).textTheme.bodyMedium);

    return Column(children: [for (final r in a.reviews.take(_shown)) _ReviewTile(review: r)]);
  }
}

class _ReviewTile extends StatelessWidget {
  const _ReviewTile({required this.review});

  final ReviewInfo review;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final locale = Localizations.localeOf(context).languageCode;
    final author = review.author.isEmpty ? '·' : review.author;
    final date = review.createdAt == null ? null : DateFormat.yMMMM(locale).format(review.createdAt!);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        border: Border.all(color: Brand.border),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: Brand.red,
                child: Text(
                  author.characters.first.toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(author, style: theme.textTheme.titleMedium),
                    if (date != null) Text(date, style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
              const Icon(Icons.star_rounded, size: 18, color: _starColor),
              const SizedBox(width: 2),
              Text(
                formatRating(review.rating, locale),
                style: theme.textTheme.bodyMedium?.copyWith(color: Brand.black, fontWeight: FontWeight.w700),
              ),
            ],
          ),
          if (review.comment != null) ...[const SizedBox(height: 10), Text(review.comment!, style: theme.textTheme.bodyMedium?.copyWith(height: 1.45))],
          if (review.reply != null) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(10)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.detailHostReply,
                    style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w700, color: Brand.black),
                  ),
                  const SizedBox(height: 2),
                  Text(review.reply!, style: theme.textTheme.bodySmall?.copyWith(height: 1.4)),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Barre fixe : le prix et le bouton restent sous le pouce pendant tout le défilement.
class _BookBar extends StatelessWidget {
  const _BookBar({required this.a});

  final AccommodationDetail a;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final lang = Localizations.localeOf(context).languageCode;

    return DecoratedBox(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Brand.border)),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: Row(
            children: [
              Expanded(
                child: Text(l10n.detailFromPerNight(formatFcfa(a.pricePerNight, lang)), style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Brand.black)),
              ),
              const SizedBox(width: 16),
              // Le parcours de réservation dans l'appli arrive ensuite : en attendant, la page du site prend le relais.
              FilledButton(
                style: FilledButton.styleFrom(minimumSize: const Size(150, 52)),
                onPressed: () => launchUrl(AppConfig.sitePage('/accommodations/${a.id}'), mode: LaunchMode.externalApplication),
                child: Text(l10n.detailBook),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailSkeleton extends StatelessWidget {
  const _DetailSkeleton();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.all(20),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [Skeleton(height: 240, radius: 20), SizedBox(height: 20), Skeleton(height: 28, width: 240), SizedBox(height: 12), Skeleton(height: 18, width: 160), SizedBox(height: 24), Skeleton(height: 90)],
    ),
  );
}
