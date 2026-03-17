// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Tamil (`ta`).
class AppLocalizationsTa extends AppLocalizations {
  AppLocalizationsTa([String locale = 'ta']) : super(locale);

  @override
  String get appTitle => 'மெட்வெரிஃபை கனெக்ட்';

  @override
  String get syncing => 'ஆஃப்லைன் தரவு ஒத்திசைக்கப்படுகிறது...';

  @override
  String get activePatients => 'செயலிலுள்ள நோயாளிகள்';

  @override
  String get missedDoses => 'தவறவிட்ட மருந்து அளவுகள்';

  @override
  String get patientProfiles => 'நோயாளி விவரங்கள்';

  @override
  String get adherence => 'கடைப்பிடித்தல்';

  @override
  String get newPrescription => 'புதிய மருந்துச் சீட்டு';

  @override
  String get digitizePrescription => 'மருந்துச் சீட்டை டிஜிட்டலாக்கு';

  @override
  String get scanDocument => 'ஆவணத்தை ஸ்கேன் செய்';

  @override
  String get extractedInformation => 'பிரித்தெடுக்கப்பட்ட தகவல்';

  @override
  String get verifyDetails => 'விவரங்களைச் சரிபார்';

  @override
  String get medicineName => 'மருந்தின் பெயர்';

  @override
  String get dosageInstructions => 'மருந்தளவு வழிமுறைகள்';

  @override
  String get saveAndSchedule => 'சேமி & விழிப்பூட்டல்களைத் திட்டமிடு';

  @override
  String get verificationComplete =>
      'சரிபார்ப்பு முடிந்தது. விழிப்பூட்டல்கள் திட்டமிடப்பட்டுள்ளன.';
}
