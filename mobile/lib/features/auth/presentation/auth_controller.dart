import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/providers.dart';
import '../data/auth_repository.dart';
import '../domain/user.dart';

/// État de la session : l'utilisateur connecté (ou null), en cours de chargement au démarrage.
class AuthController extends AsyncNotifier<User?> {
  @override
  Future<User?> build() async {
    // Le réseau signale un jeton refusé : on referme la session ici, à un seul endroit.
    final subscription = ref.read(sessionEventsProvider).unauthorized.listen((_) => _expire());
    ref.onDispose(subscription.cancel);

    return ref.read(authRepositoryProvider).restore();
  }

  Future<LoginResult> login(String email, String password) async {
    final result = await ref.read(authRepositoryProvider).login(email, password);
    if (result is LoginSuccess) state = AsyncData(result.user);

    return result;
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }

  Future<void> _expire() async {
    await ref.read(tokenStorageProvider).delete();
    if (state.value != null) state = const AsyncData(null);
  }
}

final authControllerProvider = AsyncNotifierProvider<AuthController, User?>(AuthController.new);
