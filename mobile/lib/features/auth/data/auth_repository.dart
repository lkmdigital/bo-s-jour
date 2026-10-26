import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/network/providers.dart';
import '../../../core/storage/token_storage.dart';
import '../../../l10n/app_localizations.dart';
import '../domain/user.dart';

/// Résultat d'une tentative de connexion : l'API peut répondre par une connexion réussie, ou demander
/// une étape de plus (code reçu par e-mail, double authentification) que l'appli gérera dans une prochaine version.
sealed class LoginResult {
  const LoginResult();
}

class LoginSuccess extends LoginResult {
  const LoginSuccess(this.user);
  final User user;
}

class LoginNeedsEmailOtp extends LoginResult {
  const LoginNeedsEmailOtp(this.userId);
  final int userId;
}

class LoginNeedsTwoFactor extends LoginResult {
  const LoginNeedsTwoFactor();
}

abstract class AuthRepository {
  /// Rouvre la session enregistrée sur le téléphone : l'utilisateur, ou null s'il n'y en a pas (ou plus).
  Future<User?> restore();

  Future<LoginResult> login(String email, String password);

  Future<void> logout();
}

class ApiAuthRepository implements AuthRepository {
  ApiAuthRepository(this._dio, this._storage, this._l10n);

  final Dio _dio;
  final TokenStorage _storage;
  final AppLocalizations _l10n;

  @override
  Future<User?> restore() async {
    final token = await _storage.read();
    if (token == null || token.isEmpty) return null;

    try {
      final response = await _dio.get<Map<String, dynamic>>('/me');
      return User.fromJson(response.data!);
    } on DioException catch (e) {
      final error = ApiException.fromDio(e, _l10n);
      if (error.kind == ApiErrorKind.unauthorized) {
        await _storage.delete(); // jeton expiré ou révoqué : on repart d'une session propre
        return null;
      }
      // Pas de réseau (ou panne passagère) : on garde le jeton pour la prochaine ouverture, sans session pour l'instant.
      return null;
    }
  }

  @override
  Future<LoginResult> login(String email, String password) {
    return guardApi(() async {
      final response = await _dio.post<Map<String, dynamic>>('/login', data: {'email': email.trim(), 'password': password});
      final data = response.data ?? const <String, dynamic>{};

      if (data['requires_2fa'] == true) return const LoginNeedsTwoFactor();
      if (data['requires_email_otp'] == true) return LoginNeedsEmailOtp((data['user_id'] as num?)?.toInt() ?? 0);

      final token = data['token'] as String?;
      final user = data['user'];
      if (token == null || user is! Map<String, dynamic>) {
        throw DioException(requestOptions: response.requestOptions, response: response, type: DioExceptionType.badResponse);
      }
      await _storage.write(token);

      return LoginSuccess(User.fromJson(user));
    }, _l10n);
  }

  @override
  Future<void> logout() async {
    try {
      await _dio.post<void>('/logout');
    } on DioException {
      // Hors ligne ou jeton déjà invalide : on oublie quand même la session ici.
    } finally {
      await _storage.delete();
    }
  }
}

final authRepositoryProvider = Provider<AuthRepository>((ref) => ApiAuthRepository(
      ref.watch(dioProvider),
      ref.watch(tokenStorageProvider),
      ref.watch(l10nProvider),
    ));
