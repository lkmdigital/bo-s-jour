import 'dart:async';

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/app_config.dart';
import '../../../core/error_text.dart';
import '../../../core/theme/brand.dart';
import '../../../l10n/app_localizations.dart';
import '../data/auth_repository.dart';
import 'auth_args.dart';
import 'auth_scaffold.dart';

/// « Créer mon espace » : compte voyageur individuel ou entreprise, directement dans l'appli.
/// [referral] vient d'un lien ou d'un QR d'invitation : le code est alors verrouillé.
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key, this.referral});

  final String? referral;

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _first = TextEditingController();
  final _last = TextEditingController();
  final _company = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _code = TextEditingController();
  final _codeFocus = FocusNode();
  bool _corporate = false;
  bool _hidePassword = true;
  bool _accepted = false;
  bool _termsError = false;
  bool _busy = false;
  String? _error;
  ReferralInfo? _referral;
  String _resolvedFor = '';

  @override
  void initState() {
    super.initState();
    final code = widget.referral?.trim().toUpperCase();
    if (code != null && code.isNotEmpty) {
      _code.text = code;
      unawaited(_resolve());
    }
    _codeFocus.addListener(() {
      if (!_codeFocus.hasFocus) unawaited(_resolve());
    });
  }

  @override
  void dispose() {
    for (final c in [_first, _last, _company, _email, _phone, _password, _code]) {
      c.dispose();
    }
    _codeFocus.dispose();
    super.dispose();
  }

  bool get _locked => widget.referral != null && widget.referral!.trim().isNotEmpty;

  Future<void> _resolve() async {
    final code = _code.text.trim().toUpperCase();
    if (code.isEmpty) {
      if (mounted) setState(() => _referral = null);
      return;
    }
    if (code == _resolvedFor) return;
    _resolvedFor = code;
    try {
      final info = await ref.read(authRepositoryProvider).resolveReferral(code);
      if (mounted && _code.text.trim().toUpperCase() == code) setState(() => _referral = info);
    } catch (_) {
      // Pas de réseau : le serveur vérifiera le code à la création du compte.
      if (mounted) setState(() => _referral = null);
    }
  }

  /// Numéro ivoirien saisi sans indicatif (« 07 07 00 00 00 ») → « +2250707000000 ».
  String _internationalPhone() {
    final raw = _phone.text.trim();
    final digits = raw.replaceAll(RegExp(r'[^0-9]'), '');
    if (raw.startsWith('+')) return '+$digits';
    if (raw.startsWith('00')) return '+${digits.substring(2)}';

    return '+225$digits';
  }

  Future<void> _submit() async {
    final l10n = AppLocalizations.of(context);
    final valid = _formKey.currentState!.validate();
    setState(() => _termsError = !_accepted);
    if (!valid || !_accepted) return;

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _resolve();
      final code = _code.text.trim().toUpperCase();
      final pending = await ref.read(authRepositoryProvider).register(RegisterRequest(
            firstName: _first.text,
            lastName: _last.text,
            email: _email.text,
            phone: _internationalPhone(),
            password: _password.text,
            corporate: _corporate,
            companyName: _corporate ? _company.text : null,
            referralCode: code.isEmpty ? null : code,
          ));
      if (!mounted) return;
      setState(() => _busy = false);
      context.push('/auth/otp', extra: OtpArgs(userId: pending.userId, email: pending.email, signup: true, referral: _referral?.valid == true ? _referral : null));
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
      Form(
        key: _formKey,
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(l10n.registerTitle, style: theme.textTheme.headlineMedium),
          const SizedBox(height: 6),
          Text(l10n.registerSubtitle, style: theme.textTheme.bodyMedium?.copyWith(color: Brand.textMuted)),
          const SizedBox(height: 20),
          _KindCard(key: const Key('kind-individual'), selected: !_corporate, icon: Icons.person_outline_rounded, title: l10n.registerTypeIndividual, subtitle: l10n.registerTypeIndividualSub, onTap: () => setState(() => _corporate = false)),
          const SizedBox(height: 10),
          _KindCard(key: const Key('kind-corporate'), selected: _corporate, icon: Icons.business_rounded, title: l10n.registerTypeCorporate, subtitle: l10n.registerTypeCorporateSub, onTap: () => setState(() => _corporate = true)),
          const SizedBox(height: 22),
          if (_corporate) ...[
            FieldLabel(l10n.registerCompany),
            TextFormField(key: const Key('register-company'), controller: _company, textCapitalization: TextCapitalization.words, textInputAction: TextInputAction.next, validator: (v) => (v ?? '').trim().isEmpty ? l10n.registerCompanyRequired : null),
            const SizedBox(height: 16),
          ],
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(child: _Field(label: l10n.registerFirstName, child: TextFormField(key: const Key('register-first'), controller: _first, textCapitalization: TextCapitalization.words, autofillHints: const [AutofillHints.givenName], textInputAction: TextInputAction.next, validator: (v) => (v ?? '').trim().isEmpty ? l10n.registerNameRequired : null))),
            const SizedBox(width: 12),
            Expanded(child: _Field(label: l10n.registerLastName, child: TextFormField(key: const Key('register-last'), controller: _last, textCapitalization: TextCapitalization.words, autofillHints: const [AutofillHints.familyName], textInputAction: TextInputAction.next, validator: (v) => (v ?? '').trim().isEmpty ? l10n.registerNameRequired : null))),
          ]),
          const SizedBox(height: 16),
          _Field(
            label: l10n.loginEmail,
            child: TextFormField(
              key: const Key('register-email'),
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(hintText: l10n.loginEmailHint),
              validator: (v) {
                final value = (v ?? '').trim();
                if (value.isEmpty) return l10n.loginEmailRequired;

                return RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value) ? null : l10n.loginEmailInvalid;
              },
            ),
          ),
          const SizedBox(height: 16),
          _Field(
            label: l10n.registerPhone,
            child: TextFormField(
              key: const Key('register-phone'),
              controller: _phone,
              keyboardType: TextInputType.phone,
              autofillHints: const [AutofillHints.telephoneNumber],
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(prefixText: '+225  ', prefixStyle: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w700), hintText: l10n.registerPhoneHint),
              validator: (v) => _phoneDigits(v ?? '') < 8 ? l10n.registerPhoneInvalid : null,
            ),
          ),
          const SizedBox(height: 16),
          _Field(
            label: l10n.loginPassword,
            child: TextFormField(
              key: const Key('register-password'),
              controller: _password,
              obscureText: _hidePassword,
              autofillHints: const [AutofillHints.newPassword],
              textInputAction: TextInputAction.next,
              decoration: InputDecoration(
                hintText: l10n.registerPasswordHint,
                suffixIcon: IconButton(
                  tooltip: _hidePassword ? l10n.loginShowPassword : l10n.loginHidePassword,
                  icon: Icon(_hidePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
                  onPressed: () => setState(() => _hidePassword = !_hidePassword),
                ),
              ),
              validator: (v) => (v ?? '').length < 8 ? l10n.registerPasswordTooShort : null,
            ),
          ),
          const SizedBox(height: 16),
          _Field(
            label: l10n.registerReferral,
            child: TextFormField(
              key: const Key('register-code'),
              controller: _code,
              focusNode: _codeFocus,
              readOnly: _locked,
              textCapitalization: TextCapitalization.characters,
              textInputAction: TextInputAction.done,
              decoration: InputDecoration(
                fillColor: _locked ? const Color(0xFFEFF7F3) : null,
                suffixIcon: _locked ? const Icon(Icons.lock_outline_rounded, color: Color(0xFF0E7A4B)) : null,
              ),
              onChanged: (_) => setState(() => _referral = null),
            ),
          ),
          if (_referral != null) _ReferralNote(info: _referral!),
          const SizedBox(height: 16),
          _TermsRow(
            accepted: _accepted,
            error: _termsError,
            onChanged: (v) => setState(() {
              _accepted = v;
              _termsError = false;
            }),
          ),
          const SizedBox(height: 20),
          if (_error != null) AuthError(_error!),
          FilledButton(
            key: const Key('register-submit'),
            onPressed: _busy ? null : _submit,
            child: _busy ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.4, color: Colors.white)) : Text(l10n.registerSubmit),
          ),
          const SizedBox(height: 14),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(l10n.registerHaveAccount, style: theme.textTheme.bodyMedium),
            TextButton(onPressed: () => context.canPop() ? context.pop() : context.go('/account'), child: Text(l10n.registerLogin)),
          ]),
        ]),
      ),
    ]);
  }

  static int _phoneDigits(String v) => v.replaceAll(RegExp(r'[^0-9]'), '').length;
}

class _Field extends StatelessWidget {
  const _Field({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [FieldLabel(label), child]);
}

class _KindCard extends StatelessWidget {
  const _KindCard({super.key, required this.selected, required this.icon, required this.title, required this.subtitle, required this.onTap});

  final bool selected;
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Semantics(
      button: true,
      selected: selected,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: selected ? Colors.white : Brand.surfaceMuted,
            borderRadius: BorderRadius.circular(22),
            border: Border.all(color: selected ? Brand.black : Colors.transparent, width: 1.6),
          ),
          child: Row(children: [
            CircleAvatar(radius: 22, backgroundColor: selected ? Brand.red : Brand.black, child: Icon(icon, color: Colors.white)),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(title, style: theme.textTheme.titleMedium),
                Text(subtitle, style: theme.textTheme.bodySmall),
              ]),
            ),
            AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 24,
              height: 24,
              decoration: BoxDecoration(color: selected ? Brand.black : Colors.transparent, borderRadius: BorderRadius.circular(8), border: Border.all(color: selected ? Brand.black : const Color(0xFFC9C6BD), width: 2)),
              child: selected ? const Icon(Icons.check_rounded, size: 16, color: Colors.white) : null,
            ),
          ]),
        ),
      ),
    );
  }
}

class _ReferralNote extends StatelessWidget {
  const _ReferralNote({required this.info});

  final ReferralInfo info;

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final ok = info.valid;
    final text = !ok
        ? l10n.registerReferralUnknown
        : (info.label != null ? l10n.registerReferralPartner(info.label!, '${info.discountPercent ?? 5}') : l10n.registerReferralKnown);

    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Container(
        key: const Key('referral-note'),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: ok ? const Color(0xFFEFF7F3) : const Color(0xFFFFF1F1), borderRadius: BorderRadius.circular(14), border: Border.all(color: ok ? const Color(0xFFBFE3D2) : const Color(0xFFFFCACA))),
        child: Row(children: [
          Icon(ok ? Icons.card_giftcard_rounded : Icons.error_outline_rounded, size: 20, color: ok ? const Color(0xFF0E7A4B) : Brand.redDark),
          const SizedBox(width: 10),
          Expanded(child: Text(text, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700))),
        ]),
      ),
    );
  }
}

class _TermsRow extends StatefulWidget {
  const _TermsRow({required this.accepted, required this.error, required this.onChanged});

  final bool accepted;
  final bool error;
  final ValueChanged<bool> onChanged;

  @override
  State<_TermsRow> createState() => _TermsRowState();
}

class _TermsRowState extends State<_TermsRow> {
  late final TapGestureRecognizer _terms = TapGestureRecognizer()..onTap = () => launchUrl(AppConfig.sitePage('/conditions-generales'), mode: LaunchMode.externalApplication);
  late final TapGestureRecognizer _privacy = TapGestureRecognizer()..onTap = () => launchUrl(AppConfig.sitePage('/politique-de-confidentialite'), mode: LaunchMode.externalApplication);

  @override
  void dispose() {
    _terms.dispose();
    _privacy.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context);
    final theme = Theme.of(context);
    final link = theme.textTheme.bodyMedium?.copyWith(color: Brand.redDark, fontWeight: FontWeight.w700, decoration: TextDecoration.underline);

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      InkWell(
        key: const Key('register-terms'),
        borderRadius: BorderRadius.circular(8),
        onTap: () => widget.onChanged(!widget.accepted),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              width: 24,
              height: 24,
              decoration: BoxDecoration(color: widget.accepted ? Brand.black : Colors.transparent, borderRadius: BorderRadius.circular(8), border: Border.all(color: widget.error ? Brand.redDark : (widget.accepted ? Brand.black : const Color(0xFFC9C6BD)), width: 2)),
              child: widget.accepted ? const Icon(Icons.check_rounded, size: 16, color: Colors.white) : null,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text.rich(TextSpan(style: theme.textTheme.bodyMedium, children: [
              TextSpan(text: l10n.registerAcceptPrefix),
              TextSpan(text: l10n.registerTermsLink, style: link, recognizer: _terms),
              TextSpan(text: l10n.registerAcceptAnd),
              TextSpan(text: l10n.registerPrivacyLink, style: link, recognizer: _privacy),
              const TextSpan(text: '.'),
            ])),
          ),
        ]),
      ),
      if (widget.error) Padding(padding: const EdgeInsets.only(top: 6, left: 36), child: Text(l10n.registerTermsRequired, style: theme.textTheme.bodySmall?.copyWith(color: Brand.redDark))),
    ]);
  }
}
