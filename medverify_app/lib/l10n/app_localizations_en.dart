// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for English (`en`).
class AppLocalizationsEn extends AppLocalizations {
  AppLocalizationsEn([String locale = 'en']) : super(locale);

  @override
  String get appTitle => 'MedVerify Connect';

  @override
  String get syncing => 'Syncing offline data...';

  @override
  String get activePatients => 'Active Patients';

  @override
  String get missedDoses => 'Missed Doses';

  @override
  String get patientProfiles => 'Patient Profiles';

  @override
  String get adherence => 'Adherence';

  @override
  String get newPrescription => 'New Prescription';

  @override
  String get digitizePrescription => 'Digitize Prescription';

  @override
  String get scanDocument => 'Scan Document';

  @override
  String get extractedInformation => 'Extracted Information';

  @override
  String get verifyDetails => 'Verify Details';

  @override
  String get medicineName => 'Medicine Name';

  @override
  String get dosageInstructions => 'Dosage Instructions';

  @override
  String get saveAndSchedule => 'Save & Schedule Alerts';

  @override
  String get verificationComplete => 'Verification complete. Alerts scheduled.';
}
