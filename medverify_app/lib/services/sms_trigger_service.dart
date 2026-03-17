import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'firestore_service.dart';
import 'sms_serial_service.dart';
import '../core/providers/data_providers.dart';

class SMSTriggerService {
  final FirestoreService _firestore;
  late final SMSSerialService _smsSerial;
  bool _hardwareInitialized = false;

  SMSTriggerService(this._firestore) {
    if (!kIsWeb) {
      _smsSerial = SMSSerialService();
      _hardwareInitialized = _smsSerial.initialize();
    }
  }

  void startListening(String pharmacistId) {
    _firestore.streamOrders(pharmacistId: pharmacistId).listen((orders) {
      for (var order in orders) {
        if (order.status == OrderStatus.ready) {
          _triggerSMS(order);
        }
      }
    });
  }

  void _triggerSMS(MedOrder order) async {
    // Basic logic: Get patient phone and send SMS
    // In a real app, we'd track if we've already sent it to avoid duplicates
    final patient = await _firestore.getPatient(order.patientId);
    
    // String messageEn = "Your medicine is ready. Please collect it at the Pharmacy.";
    String messageTa = "உங்கள் மருந்து தயாராக உள்ளது. Pharmacy-யில் பெற்றுக்கொள்ளவும்.";

    if (_hardwareInitialized) {
      // Send Tamil SMS (UCS2) via Hardware Gateway
      _smsSerial.sendSMS(patient.phone, messageTa, isTamil: true);
    }
  }

  void dispose() {
    if (!kIsWeb) {
      _smsSerial.dispose();
    }
  }
}

final smsTriggerServiceProvider = Provider((ref) {
  final firestore = ref.watch(firestoreServiceProvider);
  return SMSTriggerService(firestore);
});
