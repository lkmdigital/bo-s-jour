import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/providers.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/bo_models.dart';

abstract class AssistantRepository {
  /// Réglages publics (Bo actif ? ouvert aux visiteurs ?). Une panne réseau le laisse éteint : l'appli reste utilisable sans lui.
  Future<AiSettings> settings();

  /// Pose une question à Bo ; [history] : les derniers échanges (rôle, texte) pour garder le fil.
  Future<BoAnswer> ask(String question, List<({String role, String content})> history);
}

class ApiAssistantRepository implements AssistantRepository {
  ApiAssistantRepository(this._dio, this._l10n);

  final Dio _dio;
  final AppLocalizations _l10n;

  @override
  Future<AiSettings> settings() async {
    try {
      final response = await _dio.get<Map<String, dynamic>>('/settings/public');

      return AiSettings.fromJson(response.data ?? const {});
    } on DioException {
      return const AiSettings();
    }
  }

  @override
  Future<BoAnswer> ask(String question, List<({String role, String content})> history) => guardApi(() async {
        final response = await _dio.post<Map<String, dynamic>>('/assistant/ask', data: {
          'question': question,
          'history': [for (final h in history) {'role': h.role, 'content': h.content}],
        });

        return BoAnswer.fromJson(response.data ?? const {});
      }, _l10n);
}

final assistantRepositoryProvider = Provider<AssistantRepository>((ref) => ApiAssistantRepository(ref.watch(dioProvider), ref.watch(l10nProvider)));

final aiSettingsProvider = FutureProvider<AiSettings>((ref) => ref.watch(assistantRepositoryProvider).settings());
