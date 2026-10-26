import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../../core/format.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/accommodation.dart';

String accommodationTypeLabel(AppLocalizations l10n, String type) => switch (type) {
      'hotel' => l10n.typeHotel,
      'lodge' => l10n.typeLodge,
      'guesthouse' => l10n.typeGuesthouse,
      'apartment' => l10n.typeApartment,
      _ => l10n.typeOther,
    };

/// Photo d'un établissement ou d'une ville, avec un repli propre quand l'image manque ou ne charge pas.
class RemoteImage extends StatelessWidget {
  const RemoteImage({super.key, required this.url, this.fit = BoxFit.cover});

  final String? url;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final fallback = Container(color: Brand.surfaceMuted, alignment: Alignment.center, child: const Icon(Icons.hotel_rounded, color: Brand.textMuted, size: 36));
    if (url == null) return fallback;

    return CachedNetworkImage(imageUrl: url!, fit: fit, placeholder: (_, _) => Container(color: Brand.surfaceMuted), errorWidget: (_, _, _) => fallback);
  }
}

class AccommodationCard extends StatelessWidget {
  const AccommodationCard({super.key, required this.accommodation, this.onTap});

  final Accommodation accommodation;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final lang = Localizations.localeOf(context).languageCode;
    final a = accommodation;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AspectRatio(aspectRatio: 16 / 10, child: RemoteImage(url: a.imageUrl)),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: Text(a.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: theme.textTheme.titleMedium)),
                      const SizedBox(width: 12),
                      _RatingBadge(rating: a.rating, reviews: a.reviews, lang: lang),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(children: [
                    const Icon(Icons.place_outlined, size: 16, color: Brand.red),
                    const SizedBox(width: 4),
                    Expanded(child: Text('${a.city} · ${accommodationTypeLabel(l10n, a.type)}', maxLines: 1, overflow: TextOverflow.ellipsis, style: theme.textTheme.bodySmall)),
                  ]),
                  const SizedBox(height: 10),
                  Text(l10n.explorePerNight(formatFcfa(a.pricePerNight, lang)), style: theme.textTheme.titleMedium?.copyWith(color: Brand.black)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RatingBadge extends StatelessWidget {
  const _RatingBadge({required this.rating, required this.reviews, required this.lang});

  final double? rating;
  final int reviews;
  final String lang;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final style = Theme.of(context).textTheme.bodySmall?.copyWith(color: Brand.black, fontWeight: FontWeight.w700);
    if (rating == null) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(color: Brand.surfaceMuted, borderRadius: BorderRadius.circular(20)),
        child: Text(l10n.newBadge, style: style),
      );
    }

    return Row(mainAxisSize: MainAxisSize.min, children: [
      const Icon(Icons.star_rounded, size: 18, color: Color(0xFFF5A623)),
      const SizedBox(width: 2),
      Text(formatRating(rating!, lang), style: style),
    ]);
  }
}
