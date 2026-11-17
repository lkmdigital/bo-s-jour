import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/error_text.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../data/auth_repository.dart';
import 'auth_scaffold.dart';

/// Mot de passe oublié : le serveur envoie un lien (toujours la même réponse, que l'adresse existe ou non).
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  bool _busy = false;
  bool _sent = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
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
      await ref.read(authRepositoryProvider).forgotPassword(_email.text);
      if (mounted) {
        setState(() {
          _busy = false;
          _sent = true;
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

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return AuthScaffold(children: [
      Text(l10n.forgotTitle, style: theme.textTheme.headlineMedium),
      const SizedBox(height: 6),
      Text(l10n.forgotSubtitle, style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted)),
      const SizedBox(height: 24),
      Form(
        key: _formKey,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          FieldLabel(l10n.loginEmail),
          TextFormField(
            key: const Key('forgot-email'),
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            autofillHints: const [AutofillHints.email],
            textInputAction: TextInputAction.done,
            onFieldSubmitted: (_) => _submit(),
            decoration: InputDecoration(hintText: l10n.loginEmailHint),
            validator: (v) {
              final value = (v ?? '').trim();
              if (value.isEmpty) return l10n.loginEmailRequired;

              return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value) ? null : l10n.loginEmailInvalid;
            },
          ),
        ]),
      ),
      const SizedBox(height: 18),
      if (_error != null) AuthError(_error!),
      FilledButton(onPressed: _busy || _sent ? null : _submit, child: _busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white)) : Text(l10n.forgotSubmit)),
      if (_sent) ...[
        const SizedBox(height: 18),
        Container(
          key: const Key('forgot-sent'),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: const Color(0xFFEFF7F3), borderRadius: BorderRadius.circular(16)),
          child: Row(children: [
            const CircleAvatar(radius: 16, backgroundColor: Color(0xFF0E7A4B), child: Icon(Icons.check_rounded, size: 18, color: Colors.white)),
            const SizedBox(width: 12),
            Expanded(child: Text(l10n.forgotSent, style: theme.textTheme.bodyMedium)),
          ]),
        ),
        TextButton(onPressed: () => Navigator.of(context).maybePop(), child: Text(l10n.forgotBack)),
      ],
    ]);
  }
}
