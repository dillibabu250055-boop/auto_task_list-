import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'l10n/app_localizations.dart';
import 'core/theme.dart';
import 'core/locale_provider.dart';
import 'features/auth/login_screen.dart';
import 'services/auth_service.dart';
import 'services/background_service.dart';
import 'services/firestore_service.dart';
import 'features/dashboard/patient_dashboard.dart';
import 'features/dashboard/doctor_dashboard.dart';
import 'features/dashboard/pharmacist_dashboard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Initialize Firebase (Assuming options are defined or standard setup)
  // await Firebase.initializeApp(); 
  if (!kIsWeb) {
    await ScheduledTaskService.initialize();
  }
  
  runApp(
    const ProviderScope(
      child: MedVerifyApp(),
    ),
  );
}

class MedVerifyApp extends ConsumerWidget {
  const MedVerifyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final locale = ref.watch(localeProvider);
    final authState = ref.watch(authStateProvider);
    final isDemoMode = ref.watch(demoModeProvider);
    final userAsync = ref.watch(userProvider);

    return MaterialApp(
      title: 'MedVerify Connect',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.premiumDarkTheme,
      themeMode: ThemeMode.dark,
      locale: locale,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [
        Locale('en'),
        Locale('ta'),
      ],
      home: (authState.value != null || isDemoMode)
          ? userAsync.when(
              data: (user) {
                if (isDemoMode) return const PatientDashboard(); // Default for demo
                if (user == null) return const Center(child: CircularProgressIndicator());
                
                switch (user.role) {
                  case UserRole.doctor:
                    return const DoctorDashboard();
                  case UserRole.pharmacist:
                    return const PharmacistDashboard();
                  case UserRole.patient:
                    return const PatientDashboard();
                }
              },
              loading: () => const Scaffold(body: Center(child: CircularProgressIndicator())),
              error: (err, stack) => const PatientDashboard(), // Fallback
            )
          : const LoginScreen(),
    );
  }
}
