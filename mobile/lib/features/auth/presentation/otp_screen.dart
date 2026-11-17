import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/error_text.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../../../shared/widgets/otp_input.dart';
import '../data/auth_repository.dart';
import 'auth_args.dart';
import 'auth_controller.dart';
import 'auth_scaffold.dart';

/// Saisie du code à six chiffres reçu par e-mail (et SMS) : à l'inscription, ou à la première connexion.
class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key, required this.args});

  final OtpArgs args;

  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  static const _cooldown = 60;
  final _otp = GlobalKey<OtpInputState>();
  Timer? _timer;
  int _seconds = _cooldown;
  bool _busy = false;
  String? _error;
  String? _info;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() => _seconds = _cooldown);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return t.cancel();
      setState(() => _seconds--);
      if (_seconds <= 0) t.cancel();
    });
  }

  Future<void> _verify(String code) async {
    final l10n = AppLocalizations.of(context);
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).verifyOtp(widget.args.userId, code);
      if (!mounted) return;
      if (widget.args.signup) {
        context.go('/auth/welcome', extra: WelcomeArgs(referral: widget.args.referral, next: widget.args.next));
      } else {
        context.go(widget.args.next ?? '/account');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = errorText(e, l10n);
      });
      _otp.currentState?.reject();
    }
  }

  Future<void> _resend() async {
    final l10n = AppLocalizations.of(context);
    try {
      await ref.read(authRepositoryProvider).resendOtp(widget.args.email);
      if (!mounted) return;
      _otp.currentState?.clear();
      setState(() {
        _error = null;
        _info = l10n.otpResent;
      });
      _startTimer();
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, l10n));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);

    return AuthScaffold(children: [
      if (widget.args.signup) ...[
        // Barre de progression : informations → code → bienvenue.
        Row(children: [for (var i = 0; i < 3; i++) Expanded(child: Container(height: 5, margin: EdgeInsets.only(right: i < 2 ? 6 : 0), decoration: BoxDecoration(color: i < 2 ? const Color(0xFF0E7A4B) : const Color(0xFFE3E1DA), borderRadius: BorderRadius.circular(3))))]),
        const SizedBox(height: 22),
      ],
      Text(l10n.otpTitle, style: theme.textTheme.headlineMedium),
      const SizedBox(height: 6),
      Text(l10n.otpSubtitle(widget.args.email), style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted)),
      const SizedBox(height: 28),
      OtpInput(key: _otp, enabled: !_busy, onCompleted: _verify),
      const SizedBox(height: 18),
      if (_busy) const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.6, color: Brand.red))),
      if (_error != null) AuthError(_error!),
      if (_info != null) Center(child: Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(_info!, style: theme.textTheme.bodyMedium?.copyWith(color: const Color(0xFF0E7A4B), fontWeight: FontWeight.w700)))),
      Center(
        child: _seconds > 0
            ? Text(l10n.otpResendIn('$_seconds'), key: const Key('otp-countdown'), style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted))
            : TextButton(key: const Key('otp-resend'), onPressed: _resend, child: Text(l10n.otpResend)),
      ),
    ]);
  }
}
