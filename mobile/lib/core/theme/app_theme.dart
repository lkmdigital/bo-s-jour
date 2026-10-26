import 'package:flutter/material.dart';

import 'brand.dart';

class AppTheme {
  const AppTheme._();

  static ThemeData light() {
    final scheme = ColorScheme.fromSeed(seedColor: Brand.red, brightness: Brightness.light).copyWith(
      primary: Brand.red,
      onPrimary: Colors.white,
      secondary: Brand.grayGreen,
      onSecondary: Colors.white,
      surface: Colors.white,
      onSurface: Brand.black,
      error: Brand.redDark,
      outline: Brand.border,
    );

    final text = Typography.material2021().black.apply(fontFamily: Brand.fontText, bodyColor: Brand.black, displayColor: Brand.black).copyWith(
          headlineMedium: const TextStyle(fontFamily: Brand.fontText, fontWeight: FontWeight.w700, fontSize: 26, height: 1.2, color: Brand.black),
          titleLarge: const TextStyle(fontFamily: Brand.fontText, fontWeight: FontWeight.w700, fontSize: 20, height: 1.25, color: Brand.black),
          titleMedium: const TextStyle(fontFamily: Brand.fontText, fontWeight: FontWeight.w700, fontSize: 16, height: 1.3, color: Brand.black),
          bodyLarge: const TextStyle(fontFamily: Brand.fontText, fontSize: 16, height: 1.45, color: Brand.black),
          bodyMedium: const TextStyle(fontFamily: Brand.fontText, fontSize: 14, height: 1.45, color: Brand.black),
          bodySmall: const TextStyle(fontFamily: Brand.fontText, fontSize: 12.5, height: 1.4, color: Brand.textMuted),
          labelLarge: const TextStyle(fontFamily: Brand.fontText, fontWeight: FontWeight.w700, fontSize: 15),
        );

    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      fontFamily: Brand.fontText,
      textTheme: text,
      scaffoldBackgroundColor: Colors.white,
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: Brand.black,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: Brand.red,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(52),
          shape: const StadiumBorder(),
          textStyle: text.labelLarge,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: Brand.black,
          minimumSize: const Size.fromHeight(52),
          side: const BorderSide(color: Brand.black),
          shape: const StadiumBorder(),
          textStyle: text.labelLarge,
        ),
      ),
      textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: Brand.red, textStyle: text.labelLarge)),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Brand.surfaceMuted,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Brand.red, width: 1.6)),
        errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Brand.redDark)),
        focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Brand.redDark, width: 1.6)),
        hintStyle: text.bodyMedium?.copyWith(color: Brand.textMuted),
        labelStyle: text.bodyMedium?.copyWith(color: Brand.textMuted),
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: Brand.border)),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        indicatorColor: const Color(0xFFFFE5E5),
        height: 68,
        labelTextStyle: WidgetStateProperty.resolveWith((states) => TextStyle(
              fontFamily: Brand.fontText,
              fontSize: 12,
              fontWeight: states.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
              color: states.contains(WidgetState.selected) ? Brand.red : Brand.textMuted,
            )),
        iconTheme: WidgetStateProperty.resolveWith((states) => IconThemeData(color: states.contains(WidgetState.selected) ? Brand.red : Brand.textMuted)),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: Brand.black,
        contentTextStyle: text.bodyMedium?.copyWith(color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      dividerTheme: const DividerThemeData(color: Brand.border, space: 1),
    );
  }
}
