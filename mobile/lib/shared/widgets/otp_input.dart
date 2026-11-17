import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/theme/brand.dart';

/// Saisie d'un code à usage unique : une case par caractère, un seul champ de texte invisible dessous
/// (le clavier, le collage et le remplissage automatique des SMS fonctionnent donc normalement).
/// [onCompleted] est appelé dès que la dernière case est remplie.
class OtpInput extends StatefulWidget {
  const OtpInput({super.key, required this.onCompleted, this.length = 6, this.enabled = true, this.autofocus = true});

  final int length;
  final bool enabled;
  final bool autofocus;
  final ValueChanged<String> onCompleted;

  @override
  State<OtpInput> createState() => OtpInputState();
}

class OtpInputState extends State<OtpInput> with SingleTickerProviderStateMixin {
  final _controller = TextEditingController();
  final _focus = FocusNode();
  late final AnimationController _shake = AnimationController(vsync: this, duration: const Duration(milliseconds: 420));

  @override
  void initState() {
    super.initState();
    _controller.addListener(() => setState(() {}));
    _focus.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    _shake.dispose();
    super.dispose();
  }

  /// Efface la saisie (après un code refusé) et fait trembler les cases.
  void reject() {
    _controller.clear();
    if (!(MediaQuery.maybeDisableAnimationsOf(context) ?? false)) _shake.forward(from: 0);
    _focus.requestFocus();
  }

  void clear() => _controller.clear();

  @override
  Widget build(BuildContext context) {
    final text = _controller.text;
    final active = _focus.hasFocus && widget.enabled ? text.length.clamp(0, widget.length - 1) : -1;

    return AnimatedBuilder(
      animation: _shake,
      builder: (_, child) {
        final dx = _shake.isAnimating ? (1 - _shake.value) * 10 * ((_shake.value * 8).floor().isEven ? 1 : -1) : 0.0;

        return Transform.translate(offset: Offset(dx, 0), child: child);
      },
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => widget.enabled ? _focus.requestFocus() : null,
        child: Stack(alignment: Alignment.center, children: [
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            for (var i = 0; i < widget.length; i++) ...[
              if (i > 0) const SizedBox(width: 8),
              _Box(char: i < text.length ? text[i] : '', active: i == active),
            ],
          ]),
          // Champ réel, invisible, qui reçoit la saisie.
          Positioned.fill(
            child: Opacity(
              opacity: 0,
              child: TextField(
                key: const Key('otp-field'),
                controller: _controller,
                focusNode: _focus,
                autofocus: widget.autofocus,
                enabled: widget.enabled,
                keyboardType: TextInputType.number,
                autofillHints: const [AutofillHints.oneTimeCode],
                inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(widget.length)],
                showCursor: false,
                enableInteractiveSelection: false,
                onChanged: (v) {
                  if (v.length == widget.length) widget.onCompleted(v);
                },
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

class _Box extends StatelessWidget {
  const _Box({required this.char, required this.active});

  final String char;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final filled = char.isNotEmpty;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 160),
      width: 46,
      height: 58,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: active || filled ? Colors.white : Brand.surfaceMuted,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: active ? Brand.red : (filled ? Brand.black : Colors.transparent), width: 1.6),
      ),
      child: Text(char, style: const TextStyle(fontFamily: Brand.fontText, fontSize: 24, fontWeight: FontWeight.w800, color: Brand.black)),
    );
  }
}
