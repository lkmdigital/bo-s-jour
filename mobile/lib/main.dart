import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'app.dart';
import 'core/network/providers.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final info = await PackageInfo.fromPlatform();

  runApp(ProviderScope(
    // Pas de nouvelle tentative automatique : une erreur s'affiche tout de suite, avec un bouton « Réessayer ».
    retry: (_, _) => null,
    overrides: [appVersionProvider.overrideWithValue('${info.version}+${info.buildNumber}')],
    child: const BoSejourApp(),
  ));
}
