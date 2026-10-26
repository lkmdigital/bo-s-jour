import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/error_text.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/common.dart';
import '../data/accommodation_repository.dart';
import 'accommodation_card.dart';

/// Texte de recherche partagé : l'accueil le renseigne avant d'ouvrir l'onglet Explorer (ex. toucher une ville).
class ExploreQuery extends Notifier<String> {
  @override
  String build() => '';

  void set(String value) => state = value;
}

final exploreQueryProvider = NotifierProvider<ExploreQuery, String>(ExploreQuery.new);

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _controller.text = ref.read(exploreQueryProvider);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 450), () => ref.read(exploreQueryProvider.notifier).set(value.trim()));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final query = ref.watch(exploreQueryProvider);
    // Une ville touchée depuis l'accueil remplit le champ de recherche.
    ref.listen(exploreQueryProvider, (_, next) {
      if (_controller.text.trim() != next) _controller.text = next;
    });
    final results = ref.watch(searchResultsProvider(query));

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(l10n.exploreTitle, style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 12),
              TextField(
                controller: _controller,
                onChanged: _onChanged,
                textInputAction: TextInputAction.search,
                onSubmitted: (v) => ref.read(exploreQueryProvider.notifier).set(v.trim()),
                decoration: InputDecoration(
                  hintText: l10n.homeSearchHint,
                  prefixIcon: const Icon(Icons.search_rounded, color: Brand.red),
                  suffixIcon: _controller.text.isEmpty
                      ? null
                      : IconButton(icon: const Icon(Icons.close_rounded), onPressed: () {
                          _controller.clear();
                          ref.read(exploreQueryProvider.notifier).set('');
                        }),
                ),
              ),
            ]),
          ),
          Expanded(
            child: results.when(
              data: (list) => list.isEmpty
                  ? Center(child: Padding(padding: const EdgeInsets.all(32), child: Text(l10n.exploreEmpty, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodyMedium)))
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                      itemCount: list.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 16),
                      itemBuilder: (_, i) => AccommodationCard(accommodation: list[i]),
                    ),
              loading: () => ListView(padding: const EdgeInsets.fromLTRB(20, 4, 20, 24), children: List.generate(3, (_) => const Padding(padding: EdgeInsets.only(bottom: 16), child: Skeleton(height: 280, radius: 20)))),
              error: (e, _) => ErrorView(message: errorText(e, l10n), onRetry: () => ref.invalidate(searchResultsProvider(query))),
            ),
          ),
        ],
      ),
    );
  }
}
