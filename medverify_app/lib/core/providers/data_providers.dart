import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/firestore_service.dart';

final firestoreServiceProvider = Provider((ref) => FirestoreService());

final patientsStreamProvider = StreamProvider<List<Patient>>((ref) {
  final firestore = ref.watch(firestoreServiceProvider);
  return firestore.streamPatients();
});

final prescriptionsStreamProvider = StreamProvider.family<List<Prescription>, String>((ref, patientId) {
  final firestore = ref.watch(firestoreServiceProvider);
  return firestore.streamPrescriptions(patientId);
});

final missedDosesStreamProvider = StreamProvider<List<DoseEvent>>((ref) {
  final firestore = ref.watch(firestoreServiceProvider);
  return firestore.streamMissedDoses();
});

final patientProvider = FutureProvider.family<Patient, String>((ref, patientId) {
  final firestore = ref.watch(firestoreServiceProvider);
  return firestore.getPatient(patientId);
});
