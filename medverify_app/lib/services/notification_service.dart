import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  final FlutterLocalNotificationsPlugin _notifications = FlutterLocalNotificationsPlugin();

  Future<void> initialize() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    const settings = InitializationSettings(android: androidSettings, iOS: iosSettings);

    await _notifications.initialize(settings: settings);
  }

  Future<void> showReminder(String title, String body) async {
    const androidDetails = AndroidNotificationDetails(
      'med_reminders',
      'Medication Reminders',
      channelDescription: 'Alarm notifications for scheduled doses',
      importance: Importance.max,
      priority: Priority.high,
    );
    const details = NotificationDetails(android: androidDetails);

    await _notifications.show(
      id: 0,
      title: title,
      body: body,
      notificationDetails: details,
    );
  }

  /// Schedule a notification for a specific time
  Future<void> scheduleReminder(int id, String title, String body, DateTime scheduledTime) async {
    // In a real app, use TZDateTime for localized scheduling.
    // For this MVP, we show how it would be initiated.
    // flutter_local_notifications uses zonedSchedule for this.
  }
}
