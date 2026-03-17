import 'dart:async';
import 'dart:ui';
import 'package:flutter/widgets.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'notification_service.dart';
import 'sms_serial_service.dart';
import 'firestore_service.dart';

class ScheduledTaskService {
  static Future<void> initialize() async {
    final service = FlutterBackgroundService();

    await service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: onStart,
        autoStart: true,
        isForegroundMode: true,
        notificationChannelId: 'med_reminders',
        initialNotificationTitle: 'MedVerify Background Service',
        initialNotificationContent: 'Monitoring medication adherence...',
      ),
      iosConfiguration: IosConfiguration(
        autoStart: true,
        onForeground: onStart,
        onBackground: onIosBackground,
      ),
    );

    service.startService();
  }

  @pragma('vm:entry-point')
  static Future<bool> onIosBackground(ServiceInstance service) async {
    WidgetsFlutterBinding.ensureInitialized();
    DartPluginRegistrant.ensureInitialized();
    return true;
  }

  @pragma('vm:entry-point')
  static void onStart(ServiceInstance service) async {
    DartPluginRegistrant.ensureInitialized();

    final notificationService = NotificationService();
    final smsService = SMSSerialService();

    await notificationService.initialize();
    smsService.initialize();

    if (service is AndroidServiceInstance) {
      service.on('setAsForeground').listen((event) {
        service.setAsForegroundService();
      });

      service.on('setAsBackground').listen((event) {
        service.setAsBackgroundService();
      });
    }

    service.on('stopService').listen((event) {
      service.stopSelf();
    });

    // Main background loop
    Timer.periodic(const Duration(minutes: 1), (timer) async {
      final firestore = FirestoreService();
      
      try {
        final dueDoses = await firestore.getDueDoses();
        
        for (final dose in dueDoses) {
          final patient = await firestore.getPatient(dose.patientId);
          
          // 1. Show Local Notification
          await notificationService.showReminder(
            'Medication Due: ${patient.name}',
            'It is time for the scheduled medication.',
          );

          // 2. Trigger SMS via Serial Gateway
          // We use Tamil if the patient's phone suggests a local context 
          // (In a real app, this would be a per-patient preference)
          smsService.sendSMS(
            patient.phone, 
            'Reminder: Please take your scheduled medication.', 
            isTamil: false, // Default to false for now
          );

          // 3. Mark as notified to avoid repeat alerts
          await firestore.updateNotificationStatus(dose.id);
        }
      } catch (e) {
        // Log background error
      }
    });
  }

  /// Manually trigger an SMS reminder (can be called from UI or BG service)
  static void triggerManualSMS(String phone, String message, bool isTamil) {
    final smsService = SMSSerialService();
    if (smsService.initialize()) {
      smsService.sendSMS(phone, message, isTamil: isTamil);
      smsService.dispose();
    }
  }
}
