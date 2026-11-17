import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../core/theme/brand.dart';

/// Pluie de confettis jouée une seule fois (≈ 3 s), pour célébrer une étape réussie.
/// Ne s'anime pas si l'appareil demande moins de mouvement.
class Confetti extends StatefulWidget {
  const Confetti({super.key});

  @override
  State<Confetti> createState() => _ConfettiState();
}

class _ConfettiState extends State<Confetti> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 3200));
  bool _started = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    if (!(MediaQuery.maybeDisableAnimationsOf(context) ?? false)) _c.forward();
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
        child: IgnorePointer(
          child: AnimatedBuilder(animation: _c, builder: (_, _) => CustomPaint(size: Size.infinite, painter: _ConfettiPainter(_c.value))),
        ),
      );
}

class _ConfettiPainter extends CustomPainter {
  _ConfettiPainter(this.t);

  final double t;
  static const _colors = [Brand.red, Brand.black, Brand.beige, Color(0xFFFF8A8A)];

  @override
  void paint(Canvas canvas, Size size) {
    if (t == 0 || t >= 1) return;
    final rnd = math.Random(7);
    for (var i = 0; i < 40; i++) {
      final x = rnd.nextDouble() * size.width;
      final delay = rnd.nextDouble() * 0.35;
      final speed = 0.7 + rnd.nextDouble() * 0.6;
      final p = ((t - delay) / (1 - delay)).clamp(0.0, 1.0);
      if (p == 0) continue;
      final y = -20 + (size.height + 40) * p * speed;
      final sway = math.sin(p * 9 + i) * 14;
      canvas.save();
      canvas.translate(x + sway, y);
      canvas.rotate(p * 8 + i);
      canvas.drawRRect(
        RRect.fromRectAndRadius(const Rect.fromLTWH(-4, -7, 8, 14), const Radius.circular(2)),
        Paint()..color = _colors[i % _colors.length].withValues(alpha: (1 - p * 0.6).clamp(0.0, 1.0)),
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(_ConfettiPainter old) => old.t != t;
}
