import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error_text.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/otp_input.dart';
import 'auth_controller.dart';
import 'auth_scaffold.dart';

/// Seconde étape de la connexion quand la double authentification est activée sur le compte.
class TwoFactorScreen extends ConsumerStatefulWidget {
  const TwoFactorScreen({super.key, required this.tempToken});

  final String tempToken;

  @override
  ConsumerState<TwoFactorScreen> createState() => _TwoFactorScreenState();
}

class _TwoFactorScreenState extends ConsumerState<TwoFactorScreen> {
  final _otp = GlobalKey<OtpInputState>();
  final _recovery = TextEditingController();
  bool _useRecovery = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _recovery.dispose();
    super.dispose();
  }

  Future<void> _submit({String? code, String? recovery}) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).completeTwoFactor(widget.tempToken, code: code, recoveryCode: recovery);
      if (mounted) context.go('/account');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = errorText(e, l10n);
      });
      _otp.currentState?.reject();
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return AuthScaffold(children: [
      const Center(child: CircleAvatar(radius: 36, backgroundColor: Brand.black, child: Icon(Icons.shield_outlined, color: Colors.white, size: 34))),
      const SizedBox(height: 18),
      Text(l10n.twoFaTitle, textAlign: TextAlign.center, style: theme.textTheme.headlineMedium),
      const SizedBox(height: 6),
      Text(l10n.twoFaSubtitle, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted)),
      const SizedBox(height: 26),
      if (_useRecovery) ...[
        TextField(
          key: const Key('twofa-recovery'),
          controller: _recovery,
          textCapitalization: TextCapitalization.characters,
          maxLength: 8,
          decoration: InputDecoration(hintText: l10n.twoFaRecoveryHint, counterText: ''),
          onSubmitted: (_) => _recovery.text.trim().length == 8 ? _submit(recovery: _recovery.text) : null,
        ),
        const SizedBox(height: 16),
        if (_error != null) AuthError(_error!),
        FilledButton(onPressed: _busy ? null : () => _submit(recovery: _recovery.text), child: Text(l10n.twoFaSubmit)),
      ] else ...[
        OtpInput(key: _otp, enabled: !_busy, onCompleted: (c) => _submit(code: c)),
        const SizedBox(height: 18),
        if (_busy) const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.6, color: Brand.red))),
        if (_error != null) AuthError(_error!),
      ],
      const SizedBox(height: 8),
      Center(
        child: TextButton(
          key: const Key('twofa-toggle'),
          onPressed: () => setState(() {
            _useRecovery = !_useRecovery;
            _error = null;
          }),
          child: Text(_useRecovery ? l10n.twoFaUseCode : l10n.twoFaUseRecovery),
        ),
      ),
    ]);
  }
}
