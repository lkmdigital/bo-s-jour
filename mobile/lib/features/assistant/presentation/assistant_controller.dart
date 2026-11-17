import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/providers.dart';
import '../data/assistant_repository.dart';
import '../domain/bo_models.dart';

/// État de la conversation avec Bo : gardée en mémoire tant que l'appli tourne (rien n'est enregistré sur le téléphone).
class BoChatState {
  const BoChatState({this.messages = const [], this.loading = false, this.selectedId, this.startedAt = ''});

  final List<BoMessage> messages;
  final bool loading;
  final int? selectedId;
  final String startedAt;

  BoMessage? get last => messages.isEmpty ? null : messages.last;

  /// Les cartes actives sont celles de la dernière réponse de Bo.
  List<BoOffer> get activeOffers => !loading && last?.role == BoRole.assistant ? last!.offers : const [];

  BoChatState copyWith({List<BoMessage>? messages, bool? loading, int? selectedId, String? startedAt}) =>
      BoChatState(messages: messages ?? this.messages, loading: loading ?? this.loading, selectedId: selectedId ?? this.selectedId, startedAt: startedAt ?? this.startedAt);
}

class BoChatController extends Notifier<BoChatState> {
  static const historySent = 10;
  static const minQuestion = 3;

  @override
  BoChatState build() => const BoChatState();

  Future<void> ask(String raw) async {
    final text = raw.trim();
    if (text.length < minQuestion || state.loading) return;
    final l10n = ref.read(l10nProvider);

    final history = [
      for (final m in state.messages.where((m) => !m.local).toList().reversed.take(historySent).toList().reversed) (role: m.role == BoRole.user ? 'user' : 'assistant', content: m.text),
    ];
    final now = DateTime.now();
    final startedAt = state.messages.isEmpty ? '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}' : state.startedAt;
    state = state.copyWith(messages: [...state.messages, BoMessage(role: BoRole.user, text: text)], loading: true, startedAt: startedAt);

    try {
      final answer = await ref.read(assistantRepositoryProvider).ask(text, history);
      state = state.copyWith(
        messages: [...state.messages, BoMessage(role: BoRole.assistant, text: answer.text, offers: answer.offers)],
        loading: false,
        selectedId: answer.offers.isNotEmpty ? answer.offers.first.id : state.selectedId,
      );
    } on ApiException catch (e) {
      final message = switch (e.kind) {
        ApiErrorKind.unauthorized => BoMessage(role: BoRole.assistant, text: e.message, local: true, loginRequired: true),
        ApiErrorKind.tooManyRequests => BoMessage(role: BoRole.assistant, text: e.statusCode == 429 && e.message != l10n.errorTooMany ? e.message : l10n.boErrorTooFast, local: true),
        ApiErrorKind.rejected => BoMessage(role: BoRole.assistant, text: e.message, local: true),
        _ => BoMessage(role: BoRole.assistant, text: l10n.boErrorGeneric, local: true),
      };
      state = state.copyWith(messages: [...state.messages, message], loading: false);
    } catch (_) {
      state = state.copyWith(messages: [...state.messages, BoMessage(role: BoRole.assistant, text: l10n.boErrorGeneric, local: true)], loading: false);
    }
  }

  void select(int id) => state = state.copyWith(selectedId: id);

  void restart() => state = const BoChatState();
}

final boChatProvider = NotifierProvider<BoChatController, BoChatState>(BoChatController.new);
