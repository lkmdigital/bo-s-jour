import 'dart:math' as math;

import 'package:flutter/material.dart';

/// États de Bo : `idle` (les yeux clignent), `thinking` (réflexion, trois points qui pulsent),
/// `found` (yeux rieurs, quand Bo a trouvé des hébergements).
enum BoState { idle, thinking, found }

/// Bo, l'orbe de l'assistant boséjour : sphère noire brillante aux deux yeux rouges (charte « Bo, l'orbe qui vous guide »).
/// Même dessin que `BoOrb.tsx` du site, entièrement vectoriel, net à toutes les tailles.
/// Les animations s'arrêtent quand l'appareil demande moins de mouvement.
class BoOrb extends StatefulWidget {
  const BoOrb({super.key, this.size = 40, this.state = BoState.idle, this.shadow = false});

  final double size;
  final BoState state;

  /// Halo rouge sous l'orbe, pour la grande version de l'écran d'accueil.
  final bool shadow;

  @override
  State<BoOrb> createState() => _BoOrbState();
}

class _BoOrbState extends State<BoOrb> with SingleTickerProviderStateMixin {
  late final AnimationController _clock = AnimationController(vsync: this, duration: const Duration(milliseconds: 5500));
  bool _running = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduce = MediaQuery.maybeDisableAnimationsOf(context) ?? false;
    if (reduce && _running) {
      _clock.stop();
      _running = false;
    } else if (!reduce && !_running) {
      _clock.repeat();
      _running = true;
    }
  }

  @override
  void dispose() {
    _clock.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      excludeSemantics: true,
      child: RepaintBoundary(
        child: AnimatedBuilder(
          animation: _clock,
          builder: (_, _) => CustomPaint(
            size: Size(widget.size, widget.shadow ? widget.size * 1.12 : widget.size),
            painter: BoOrbPainter(state: widget.state, shadow: widget.shadow, t: _clock.value),
          ),
        ),
      ),
    );
  }
}

/// Dessin de l'orbe dans un repère de 100 × 100 (112 de haut avec l'ombre), comme le SVG du site.
class BoOrbPainter extends CustomPainter {
  const BoOrbPainter({required this.state, required this.shadow, this.t = 0});

  final BoState state;
  final bool shadow;

  /// Position dans le cycle de 5,5 s (0 à 1).
  final double t;

  static const Color red = Color(0xFFFF0000);

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 100, size.width / 100);

    if (shadow) {
      canvas.save();
      canvas.translate(50, 104);
      canvas.scale(1, 6 / 40);
      canvas.drawCircle(
        Offset.zero,
        40,
        Paint()..shader = RadialGradient(colors: [red.withValues(alpha: 0.45), red.withValues(alpha: 0)]).createShader(Rect.fromCircle(center: Offset.zero, radius: 40)),
      );
      canvas.restore();
    }

    const center = Offset(50, 50);
    const body = Rect.fromLTWH(2, 2, 96, 96);
    canvas.drawCircle(
      center,
      48,
      Paint()
        ..shader = const RadialGradient(
          center: Alignment(-0.32, -0.48),
          radius: 0.8,
          colors: [Color(0xFF4A4A4A), Color(0xFF1C1C1C), Color(0xFF050505)],
          stops: [0, 0.38, 1],
        ).createShader(body),
    );

    canvas.save();
    canvas.clipPath(Path()..addOval(body));
    // Lueur rouge en bas de la sphère.
    canvas.save();
    canvas.translate(50, 100);
    canvas.scale(1, 0.5);
    canvas.drawRect(
      const Rect.fromLTRB(-50, -100, 50, 0),
      Paint()..shader = RadialGradient(colors: [red.withValues(alpha: 0.85), red.withValues(alpha: 0)]).createShader(Rect.fromCircle(center: Offset.zero, radius: 55)),
    );
    canvas.restore();
    // Reflet.
    canvas.save();
    canvas.translate(34, 24);
    canvas.rotate(-24 * math.pi / 180);
    canvas.drawOval(const Rect.fromLTRB(-20, -11, 20, 11), Paint()..color = Colors.white.withValues(alpha: 0.2));
    canvas.restore();
    canvas.drawCircle(const Offset(25, 21), 3, Paint()..color = Colors.white.withValues(alpha: 0.45));
    canvas.restore();

    _eyes(canvas);
    canvas.restore();
  }

  /// Les yeux sont dessinés deux fois : une fois flous (halo), une fois nets.
  void _eyes(Canvas canvas) {
    void both(void Function(Paint) draw) {
      draw(Paint()
        ..color = red
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2.2));
      draw(Paint()..color = red);
    }

    switch (state) {
      case BoState.found:
        both((p) {
          p
            ..style = PaintingStyle.stroke
            ..strokeWidth = 5
            ..strokeCap = StrokeCap.round
            ..strokeJoin = StrokeJoin.round;
          canvas.drawPath(Path()..moveTo(29, 56)..lineTo(37, 47)..lineTo(45, 56), p);
          canvas.drawPath(Path()..moveTo(55, 56)..lineTo(63, 47)..lineTo(71, 56), p);
        });
      case BoState.thinking:
        // Cycle de 1,1 s : 5 pulsations dans les 5,5 s de l'horloge.
        final phase = (t * 5) % 1;
        both((p) {
          canvas.drawCircle(const Offset(38, 46), 5, p);
          canvas.drawCircle(const Offset(62, 46), 5, p);
        });
        for (var i = 0; i < 3; i++) {
          final local = (phase - i * 0.18 / 1.1) % 1;
          final alpha = 0.25 + 0.75 * (local < 0.4 ? local / 0.4 : math.max(0, 1 - (local - 0.4) / 0.6));
          both((p) {
            final c = p.color;
            p.color = c.withValues(alpha: alpha);
            canvas.drawCircle(Offset(40.0 + i * 10, 64), 2.6, p);
          });
        }
      case BoState.idle:
        // Clignement : les yeux s'aplatissent entre 44 % et 50 % du cycle.
        final scaleY = t < 0.44 || t > 0.50 ? 1.0 : (t < 0.47 ? 1 - 0.88 * (t - 0.44) / 0.03 : 0.12 + 0.88 * (t - 0.47) / 0.03);
        for (final x in const [33.0, 58.0]) {
          both((p) {
            canvas.save();
            canvas.translate(x + 4.5, 50.5);
            canvas.scale(1, scaleY);
            canvas.drawRRect(RRect.fromRectAndRadius(const Rect.fromLTWH(-4.5, -10.5, 9, 21), const Radius.circular(4.5)), p);
            canvas.restore();
          });
        }
    }
  }

  @override
  bool shouldRepaint(BoOrbPainter old) => old.state != state || old.shadow != shadow || old.t != t;
}
