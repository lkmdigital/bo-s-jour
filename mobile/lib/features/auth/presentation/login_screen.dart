import 'package:flutter/material.dart';

import 'auth_scaffold.dart';
import 'login_form.dart';

/// Connexion en plein écran (hors onglet Compte), pour revenir ensuite là où l'on était, par exemple à une réservation.
class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key, this.next});

  final String? next;

  @override
  Widget build(BuildContext context) => AuthScaffold(children: [LoginForm(next: next)]);
}
