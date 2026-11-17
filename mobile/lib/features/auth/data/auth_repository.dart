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
  const LoginNeedsTwoFactor([this.tempToken = '']);

  /// Jeton temporaire que le serveur accepte uniquement pour valider le code (jamais enregistré sur le téléphone).
  final String tempToken;
}

/// Données du formulaire « Créer mon espace ».
class RegisterRequest {
  const RegisterRequest({
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.phone,
    required this.password,
    this.corporate = false,
    this.companyName,
    this.referralCode,
  });

  final String firstName;
  final String lastName;
  final String email;
  final String phone;
  final String password;
  final bool corporate;
  final String? companyName;
  final String? referralCode;

  Map<String, Object?> toJson() => {
        'first_name': firstName.trim(),
        'last_name': lastName.trim(),
        'email': email.trim(),
        'phone': phone.trim(),
        'whatsapp': phone.trim(),
        'password': password,
        'password_confirmation': password,
        'traveler_type': corporate ? 'corporate' : 'individual',
        if (corporate) 'company_name': companyName?.trim(),
        'accept_terms': true,
        if (referralCode != null && referralCode!.trim().isNotEmpty) 'referral_code': referralCode!.trim().toUpperCase(),
      };
}

/// Un code à six chiffres a été envoyé (e-mail et SMS) : il reste à le saisir pour ouvrir la session.
class PendingVerification {
  const PendingVerification({required this.userId, required this.email});

  final int userId;
  final String email;
}

/// Résultat de la reconnaissance d'un code d'invitation (ambassadeur ou membre).
class ReferralInfo {
  const ReferralInfo({required this.valid, this.label, this.discountPercent});

  final bool valid;
  final String? label;
  final num? discountPercent;
}

abstract class AuthRepository {
  /// Rouvre la session enregistrée sur le téléphone : l'utilisateur, ou null s'il n'y en a pas (ou plus).
  Future<User?> restore();

  Future<LoginResult> login(String email, String password);

  /// Crée le compte voyageur. Aucune session n'est ouverte : l'e-mail doit d'abord être vérifié avec [verifyOtp].
  Future<PendingVerification> register(RegisterRequest request);

  /// Valide le code reçu : ouvre la session (jeton enregistré) et renvoie l'utilisateur.
  Future<User> verifyOtp(int userId, String code);

  /// Renvoie un nouveau code (le serveur ne révèle jamais si l'adresse existe).
  Future<void> resendOtp(String email);

  /// Seconde étape de la double authentification : code de l'application ou code de secours (8 caractères).
  Future<User> completeTwoFactor(String tempToken, {String? code, String? recoveryCode});

  Future<void> forgotPassword(String email);

  /// Un code d'invitation est-il connu ? Sert à afficher « Invitation de … » avant la création du compte.
  Future<ReferralInfo> resolveReferral(String code);

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

      if (data['requires_2fa'] == true) return LoginNeedsTwoFactor(data['temp_token'] as String? ?? '');
      if (data['requires_email_otp'] == true) return LoginNeedsEmailOtp((data['user_id'] as num?)?.toInt() ?? 0);

      return LoginSuccess(await _openSession(response));
    }, _l10n);
  }

  Future<User> _openSession(Response<Map<String, dynamic>> response) async {
    final data = response.data ?? const <String, dynamic>{};
    final token = data['token'] as String?;
    final user = data['user'];
    if (token == null || user is! Map<String, dynamic>) {
      throw DioException(requestOptions: response.requestOptions, response: response, type: DioExceptionType.badResponse);
    }
    await _storage.write(token);

    return User.fromJson(user);
  }

  @override
  Future<PendingVerification> register(RegisterRequest request) {
    return guardApi(() async {
      final response = await _dio.post<Map<String, dynamic>>('/auth/register-traveler', data: request.toJson());
      final data = response.data ?? const <String, dynamic>{};
      final id = (data['user_id'] as num?)?.toInt();
      if (data['requires_email_otp'] != true || id == null) {
        throw DioException(requestOptions: response.requestOptions, response: response, type: DioExceptionType.badResponse);
      }

      return PendingVerification(userId: id, email: data['email'] as String? ?? request.email.trim());
    }, _l10n);
  }

  @override
  Future<User> verifyOtp(int userId, String code) {
    return guardApi(() async => _openSession(await _dio.post<Map<String, dynamic>>('/auth/verify-otp', data: {'user_id': userId, 'code': code.trim()})), _l10n);
  }

  @override
  Future<void> resendOtp(String email) {
    return guardApi(() async {
      await _dio.post<void>('/auth/send-otp', data: {'email': email.trim()});
    }, _l10n);
  }

  @override
  Future<User> completeTwoFactor(String tempToken, {String? code, String? recoveryCode}) {
    return guardApi(() async {
      final response = await _dio.post<Map<String, dynamic>>(
        '/login/complete-2fa',
        data: {if (code != null) 'code': code.trim(), if (recoveryCode != null) 'recovery_code': recoveryCode.trim().toUpperCase()},
        options: Options(headers: {'Authorization': 'Bearer $tempToken'}),
      );

      return _openSession(response);
    }, _l10n);
  }

  @override
  Future<void> forgotPassword(String email) {
    return guardApi(() async {
      await _dio.post<void>('/auth/forgot-password', data: {'email': email.trim()});
    }, _l10n);
  }

  @override
  Future<ReferralInfo> resolveReferral(String code) {
    return guardApi(() async {
      final response = await _dio.get<Map<String, dynamic>>('/referral/resolve/${Uri.encodeComponent(code.trim())}');
      final data = response.data ?? const <String, dynamic>{};

      return ReferralInfo(valid: data['valid'] == true, label: data['label'] as String?, discountPercent: data['discount_percent'] as num?);
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
