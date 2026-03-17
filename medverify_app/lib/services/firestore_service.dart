import 'package:cloud_firestore/cloud_firestore.dart';

/// Data models and Firestore service for MedVerify Connect.
/// Firestore offline persistence is enabled by default in the Flutter
/// Firebase SDK — data captured offline will auto-sync on reconnect.

// ─── Firestore Collection Names ───────────────────────────────────────────────
// ─── User Roles ──────────────────────────────────────────────────────────────
enum UserRole { patient, doctor, pharmacist }

// ─── App User Model ──────────────────────────────────────────────────────────
class AppUser {
  final String uid;
  final String name;
  final String email;
  final String phone;
  final UserRole role;
  final double reputation; // For Pharmacists (1-5 star)
  final int adherenceStreak; // For Patients

  AppUser({
    required this.uid,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    this.reputation = 5.0,
    this.adherenceStreak = 0,
  });

  factory AppUser.fromDoc(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return AppUser(
      uid: doc.id,
      name: data['name'] ?? '',
      email: data['email'] ?? '',
      phone: data['phone'] ?? '',
      role: UserRole.values.firstWhere(
        (e) => e.name == (data['role'] as String).toLowerCase(),
        orElse: () => UserRole.patient,
      ),
      reputation: (data['reputation'] as num? ?? 5.0).toDouble(),
      adherenceStreak: data['adherenceStreak'] ?? 0,
    );
  }

  Map<String, dynamic> toMap() => {
        'name': name,
        'email': email,
        'phone': phone,
        'role': role.name,
        'reputation': reputation,
        'adherenceStreak': adherenceStreak,
      };
}

// ─── Collection Names ────────────────────────────────────────────────────────
class Collections {
  static const String users         = 'users';
  static const String patients      = 'patients';
  static const String prescriptions = 'prescriptions';
  static const String doses         = 'doses';
  static const String orders        = 'orders';
  static const String appointments  = 'appointments';
}

// ─── Patient Model ────────────────────────────────────────────────────────────
class Patient {
  final String id;
  final String name;
  final String phone;   // E.164 format for SMS gateway
  final String village;
  final int    adherenceStreak; // consecutive days doses taken
  final int    missedDoses;

  Patient({
    required this.id,
    required this.name,
    required this.phone,
    required this.village,
    this.adherenceStreak = 0,
    this.missedDoses = 0,
  });

  factory Patient.fromDoc(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Patient(
      id:               doc.id,
      name:             data['name'] ?? '',
      phone:            data['phone'] ?? '',
      village:          data['village'] ?? '',
      adherenceStreak:  data['adherenceStreak'] ?? 0,
      missedDoses:      data['missedDoses'] ?? 0,
    );
  }

  Map<String, dynamic> toMap() => {
    'name':             name,
    'phone':            phone,
    'village':          village,
    'adherenceStreak':  adherenceStreak,
    'missedDoses':      missedDoses,
    'updatedAt':        FieldValue.serverTimestamp(),
  };
}

// ─── Prescription Model ───────────────────────────────────────────────────────
class Prescription {
  final String id;
  final String patientId;
  final String doctorId;
  final String medicineName;
  final String dosageInstructions;
  final String frequency;   // e.g. "Morning, Night"
  final String duration;    // e.g. "7 days"
  final String rawOcrText;  // Original ML Kit output before verification
  final bool   isDigital;   // True if created via Digital Prescription Pad
  final DateTime createdAt;

  Prescription({
    required this.id,
    required this.patientId,
    required this.doctorId,
    required this.medicineName,
    required this.dosageInstructions,
    required this.frequency,
    required this.duration,
    this.rawOcrText = '',
    this.isDigital = false,
    required this.createdAt,
  });

  factory Prescription.fromDoc(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Prescription(
      id:                  doc.id,
      patientId:           data['patientId'] ?? '',
      doctorId:            data['doctorId'] ?? '',
      medicineName:        data['medicineName'] ?? '',
      dosageInstructions:  data['dosageInstructions'] ?? '',
      frequency:           data['frequency'] ?? '',
      duration:            data['duration'] ?? '',
      rawOcrText:          data['rawOcrText'] ?? '',
      isDigital:           data['isDigital'] ?? false,
      createdAt:           (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() => {
    'patientId':          patientId,
    'doctorId':           doctorId,
    'medicineName':       medicineName,
    'dosageInstructions': dosageInstructions,
    'frequency':          frequency,
    'duration':           duration,
    'rawOcrText':         rawOcrText,
    'isDigital':          isDigital,
    'createdAt':          FieldValue.serverTimestamp(),
  };
}

// ─── Dose Event Model (for compliance tracking) ───────────────────────────────
class DoseEvent {
  final String id;
  final String patientId;
  final String prescriptionId;
  final bool   taken;
  final DateTime scheduledAt;
  final DateTime? takenAt;
  final DateTime? lastNotifiedAt;

  DoseEvent({
    required this.id,
    required this.patientId,
    required this.prescriptionId,
    required this.taken,
    required this.scheduledAt,
    this.takenAt,
    this.lastNotifiedAt,
  });

  factory DoseEvent.fromDoc(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return DoseEvent(
      id:               doc.id,
      patientId:        data['patientId'] ?? '',
      prescriptionId:   data['prescriptionId'] ?? '',
      taken:            data['taken'] ?? false,
      scheduledAt:      (data['scheduledAt'] as Timestamp).toDate(),
      takenAt:          (data['takenAt'] as Timestamp?)?.toDate(),
      lastNotifiedAt:   (data['lastNotifiedAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toMap() => {
    'patientId':        patientId,
    'prescriptionId':   prescriptionId,
    'taken':            taken,
    'scheduledAt':      Timestamp.fromDate(scheduledAt),
    'takenAt':          takenAt != null ? Timestamp.fromDate(takenAt!) : null,
    'lastNotifiedAt':   lastNotifiedAt != null ? Timestamp.fromDate(lastNotifiedAt!) : null,
  };
}

// ─── Order Model ─────────────────────────────────────────────────────────────
enum OrderStatus { pending, packing, ready, completed }

class MedOrder {
  final String id;
  final String patientId;
  final String pharmacistId;
  final String prescriptionId;
  final OrderStatus status;
  final bool discountApplied;
  final DateTime createdAt;

  MedOrder({
    required this.id,
    required this.patientId,
    required this.pharmacistId,
    required this.prescriptionId,
    required this.status,
    this.discountApplied = false,
    required this.createdAt,
  });

  factory MedOrder.fromDoc(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return MedOrder(
      id: doc.id,
      patientId: data['patientId'] ?? '',
      pharmacistId: data['pharmacistId'] ?? '',
      prescriptionId: data['prescriptionId'] ?? '',
      status: OrderStatus.values.firstWhere(
        (e) => e.name == (data['status'] as String? ?? 'pending'),
        orElse: () => OrderStatus.pending,
      ),
      discountApplied: data['discountApplied'] ?? false,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() => {
    'patientId': patientId,
    'pharmacistId': pharmacistId,
    'prescriptionId': prescriptionId,
    'status': status.name,
    'discountApplied': discountApplied,
    'createdAt': FieldValue.serverTimestamp(),
  };
}

// ─── Appointment Model ────────────────────────────────────────────────────────
enum AppointmentStatus { requested, scheduled, completed, cancelled }

class Appointment {
  final String id;
  final String patientId;
  final String doctorId;
  final AppointmentStatus status;
  final DateTime? scheduledAt;
  final String type; // audio-call, callback
  final DateTime createdAt;

  Appointment({
    required this.id,
    required this.patientId,
    required this.doctorId,
    required this.status,
    this.scheduledAt,
    required this.type,
    required this.createdAt,
  });

  factory Appointment.fromDoc(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Appointment(
      id: doc.id,
      patientId: data['patientId'] ?? '',
      doctorId: data['doctorId'] ?? '',
      status: AppointmentStatus.values.firstWhere(
        (e) => e.name == (data['status'] as String? ?? 'requested'),
        orElse: () => AppointmentStatus.requested,
      ),
      scheduledAt: (data['scheduledAt'] as Timestamp?)?.toDate(),
      type: data['type'] ?? 'callback',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() => {
    'patientId': patientId,
    'doctorId': doctorId,
    'status': status.name,
    'scheduledAt': scheduledAt != null ? Timestamp.fromDate(scheduledAt!) : null,
    'type': type,
    'createdAt': FieldValue.serverTimestamp(),
  };
}

// ─── Firestore Service ────────────────────────────────────────────────────────
class FirestoreService {
  FirebaseFirestore? _dbInstance;
  
  FirebaseFirestore get _db {
    try {
      _dbInstance ??= FirebaseFirestore.instance;
      return _dbInstance!;
    } catch (e) {
      throw Exception("Firestore not available");
    }
  }

  bool get isAvailable {
    try {
      FirebaseFirestore.instance;
      return true;
    } catch (_) {
      return false;
    }
  }

  // Enable offline persistence (auto-sync when back online)
  static Future<void> enableOfflinePersistence() async {
    try {
      FirebaseFirestore.instance.settings = const Settings(
        persistenceEnabled: true,
        cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
      );
    } catch (_) {}
  }

  // ── Patients ──────────────────────────────────────────────────────────────
  Stream<List<Patient>> streamPatients() {
    try {
      return _db
          .collection(Collections.patients)
          .orderBy('name')
          .snapshots()
          .map((snap) => snap.docs.map(Patient.fromDoc).toList());
    } catch (e) {
      // Return mock data for Demo Mode
      return Stream.value([
        Patient(id: 'p1', name: 'Arumugam P.', phone: '919876543210', village: 'Melur', adherenceStreak: 12),
        Patient(id: 'p2', name: 'Lakshmi K.', phone: '919876543211', village: 'Melur', adherenceStreak: 45),
        Patient(id: 'p3', name: 'Rajesh M.', phone: '919876543212', village: 'Alagar', adherenceStreak: 0),
      ]);
    }
  }

  Future<void> addPatient(Patient patient) {
    return _db.collection(Collections.patients).add(patient.toMap());
  }

  Future<void> updateAdherence(String patientId, {required bool doseTaken}) async {
    final ref = _db.collection(Collections.patients).doc(patientId);
    return _db.runTransaction((tx) async {
      final snap = await tx.get(ref);
      final data = snap.data() as Map<String, dynamic>;
      final streak = (data['adherenceStreak'] as int? ?? 0);
      final missed = (data['missedDoses'] as int? ?? 0);
      tx.update(ref, {
        'adherenceStreak': doseTaken ? streak + 1 : 0,
        'missedDoses':     doseTaken ? missed : missed + 1,
      });
    });
  }

  // ── Prescriptions ─────────────────────────────────────────────────────────
  Future<String> addPrescription(Prescription prescription) async {
    final doc = await _db
        .collection(Collections.prescriptions)
        .add(prescription.toMap());
    return doc.id;
  }

  Stream<List<Prescription>> streamPrescriptions(String patientId) {
    try {
      return _db
          .collection(Collections.prescriptions)
          .where('patientId', isEqualTo: patientId)
          .orderBy('createdAt', descending: true)
          .snapshots()
          .map((snap) => snap.docs.map(Prescription.fromDoc).toList());
    } catch (e) {
      // Mock prescriptions for demo patient
      if (patientId == 'demo_patient' || !isAvailable) {
        return Stream.value([
          Prescription(
            id: 'pr1',
            patientId: patientId,
            doctorId: 'demo_doctor',
            medicineName: 'Metformin 500mg',
            dosageInstructions: '1 tablet after breakfast',
            frequency: 'Morning',
            duration: '30 days',
            isDigital: false,
            createdAt: DateTime.now(),
          ),
          Prescription(
            id: 'pr2',
            patientId: patientId,
            doctorId: 'demo_doctor',
            medicineName: 'Amlodipine 5mg',
            dosageInstructions: '1 tablet before sleep',
            frequency: 'Night',
            duration: '30 days',
            isDigital: false,
            createdAt: DateTime.now(),
          ),
        ]);
      }
      return Stream.value([]);
    }
  }

  // ── Dose Events ───────────────────────────────────────────────────────────
  Future<void> recordDose(DoseEvent dose) {
    return _db.collection(Collections.doses).add(dose.toMap());
  }

  Stream<List<DoseEvent>> streamMissedDoses() {
    try {
      final cutoff = DateTime.now().subtract(const Duration(hours: 24));
      return _db
          .collection(Collections.doses)
          .where('taken', isEqualTo: false)
          .where('scheduledAt', isGreaterThan: Timestamp.fromDate(cutoff))
          .snapshots()
          .map((snap) => snap.docs.map(DoseEvent.fromDoc).toList());
    } catch (e) {
      // Mock missed doses
      return Stream.value([
        DoseEvent(id: 'd1', patientId: 'p3', prescriptionId: 'pr1', taken: false, scheduledAt: DateTime.now().subtract(const Duration(hours: 2))),
      ]);
    }
  }

  // ── Background Helpers ────────────────────────────────────────────────────
  Future<List<DoseEvent>> getDueDoses() async {
    final now = DateTime.now();
    final windowStart = now.subtract(const Duration(minutes: 15));
    
    // Find doses scheduled in the last 15 mins that haven't been taken or notified
    final snap = await _db
        .collection(Collections.doses)
        .where('taken', isEqualTo: false)
        .where('scheduledAt', isLessThanOrEqualTo: Timestamp.fromDate(now))
        .where('scheduledAt', isGreaterThanOrEqualTo: Timestamp.fromDate(windowStart))
        .get();

    return snap.docs
        .map(DoseEvent.fromDoc)
        .where((dose) => dose.lastNotifiedAt == null)
        .toList();
  }

  Future<void> updateNotificationStatus(String doseId) {
    return _db.collection(Collections.doses).doc(doseId).update({
      'lastNotifiedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<Patient> getPatient(String patientId) async {
    final doc = await _db.collection(Collections.patients).doc(patientId).get();
    return Patient.fromDoc(doc);
  }

  // ── Users (RBAC) ──────────────────────────────────────────────────────────
  Future<AppUser?> getUser(String uid) async {
    try {
      final doc = await _db.collection(Collections.users).doc(uid).get();
      if (!doc.exists) return null;
      return AppUser.fromDoc(doc);
    } catch (e) {
      // Mock user for Demo Mode
      return AppUser(
        uid: uid,
        name: 'Demo User',
        email: 'demo@medverify.com',
        phone: '919876543210',
        role: UserRole.patient,
        reputation: 4.8,
        adherenceStreak: 7,
      );
    }
  }

  // ── Orders ────────────────────────────────────────────────────────────────
  Future<String> createOrder(MedOrder order) async {
    final doc = await _db.collection(Collections.orders).add(order.toMap());
    return doc.id;
  }

  Stream<List<MedOrder>> streamOrders({String? pharmacistId, String? patientId}) {
    var query = _db.collection(Collections.orders).orderBy('createdAt', descending: true);
    if (pharmacistId != null) query = query.where('pharmacistId', isEqualTo: pharmacistId);
    if (patientId != null) query = query.where('patientId', isEqualTo: patientId);
    
    return query.snapshots().map((snap) => snap.docs.map(MedOrder.fromDoc).toList());
  }

  Future<void> updateOrderStatus(String orderId, OrderStatus status) {
    return _db.collection(Collections.orders).doc(orderId).update({'status': status.name});
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  Future<String> requestAppointment(Appointment appointment) async {
    final doc = await _db.collection(Collections.appointments).add(appointment.toMap());
    return doc.id;
  }

  Stream<List<Appointment>> streamAppointments({String? doctorId, String? patientId}) {
    var query = _db.collection(Collections.appointments).orderBy('createdAt', descending: true);
    if (doctorId != null) query = query.where('doctorId', isEqualTo: doctorId);
    if (patientId != null) query = query.where('patientId', isEqualTo: patientId);
    
    return query.snapshots().map((snap) => snap.docs.map(Appointment.fromDoc).toList());
  }

  Future<void> updateAppointmentStatus(String appointmentId, AppointmentStatus status, {DateTime? scheduledAt}) {
    return _db.collection(Collections.appointments).doc(appointmentId).update({
      'status': status.name,
      if (scheduledAt != null) 'scheduledAt': Timestamp.fromDate(scheduledAt),
    });
  }
}
