import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/app_config.dart';
import '../../../core/error_text.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/common.dart';
import '../data/auth_repository.dart';
import 'auth_controller.dart';

/// Formulaire de connexion (onglet Compte quand personne n'est connecté).
class LoginForm extends ConsumerStatefulWidget {
  const LoginForm({super.key});

  @override
  ConsumerState<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends ConsumerState<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _hidePassword = true;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });

    try {
      final result = await ref.read(authControllerProvider.notifier).login(_email.text, _password.text);
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = switch (result) {
          LoginSuccess() => null, // la session est ouverte : l'onglet Compte change tout seul
          LoginNeedsEmailOtp() => l10n.loginNeedsOtp,
          LoginNeedsTwoFactor() => l10n.loginNeedsTwoFactor,
        };
      });
    } on ApiException catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = e.message;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = errorText(e, l10n);
        });
      }
    }
  }

  Future<void> _openSite(String path) => launchUrl(AppConfig.sitePage(path), mode: LaunchMode.externalApplication);

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Align(alignment: Alignment.centerLeft, child: BoSejourLogo()),
          const SizedBox(height: 28),
          Text(l10n.loginTitle, style: theme.textTheme.headlineMedium),
          const SizedBox(height: 6),
          Text(l10n.loginSubtitle, style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted)),
          const SizedBox(height: 24),
          _FieldLabel(l10n.loginEmail),
          TextFormField(
            key: const Key('login-email'),
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            textInputAction: TextInputAction.next,
            decoration: InputDecoration(hintText: l10n.loginEmailHint),
            validator: (v) {
              final value = (v ?? '').trim();
              if (value.isEmpty) return l10n.loginEmailRequired;
              if (!RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value)) return l10n.loginEmailInvalid;

              return null;
            },
          ),
          const SizedBox(height: 16),
          _FieldLabel(l10n.loginPassword),
          TextFormField(
            key: const Key('login-password'),
            controller: _password,
            obscureText: _hidePassword,
            autofillHints: const [AutofillHints.password],
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _submit(),
            decoration: InputDecoration(
              suffixIcon: IconButton(
                tooltip: _hidePassword ? l10n.loginShowPassword : l10n.loginHidePassword,
                icon: Icon(_hidePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                onPressed: () => setState(() => _hidePassword = !_hidePassword),
              ),
            ),
            validator: (v) => (v ?? '').isEmpty ? l10n.loginPasswordRequired : null,
          ),
          Align(alignment: Alignment.centerRight, child: TextButton(onPressed: () => _openSite('/auth/forgot-password'), child: Text(l10n.loginForgot))),
          if (_error != null)
            Container(
              key: const Key('login-error'),
              margin: const EdgeInsets.only(bottom: 14),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: const Color(0xFFFFF1F1), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFFFFCACA))),
              child: Text(_error!, style: theme.textTheme.bodyMedium?.copyWith(color: Brand.redDark)),
            ),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: _busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white)) : Text(l10n.loginSubmit),
          ),
          const SizedBox(height: 18),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(l10n.loginNoAccount, style: theme.textTheme.bodyMedium),
            TextButton(onPressed: () => _openSite('/auth/register'), child: Text(l10n.loginCreate)),
          ]),
        ],
      ),
    );
  }
}

/// Libellé placé au-dessus d'un champ (comme sur le site).
class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8, left: 4),
        child: Text(text, style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
      );
}
