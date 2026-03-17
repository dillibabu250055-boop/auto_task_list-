import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'firestore_service.dart';
import '../core/providers/data_providers.dart';

class AuthService {
  FirebaseAuth? _authInstance;
  FirebaseAuth get _auth {
    try {
      _authInstance ??= FirebaseAuth.instance;
      return _authInstance!;
    } catch (e) {
      // Return a mock or handle the error
      throw Exception("Firebase not initialized or unavailable");
    }
  }

  Stream<User?> get authStateChanges {
    try {
      return _auth.authStateChanges();
    } catch (_) {
      return Stream.value(null);
    }
  }

  Future<UserCredential?> signInWithEmail(String email, String password) async {
    return await _auth.signInWithEmailAndPassword(email: email, password: password);
  }

  Future<void> signInDemo() async {
    await Future.delayed(const Duration(seconds: 1));
  }

  Future<void> signOut() async {
    try {
      await _auth.signOut();
    } catch (_) {}
  }
}

final authServiceProvider = Provider<AuthService>((ref) => AuthService());

final authStateProvider = StreamProvider<User?>((ref) {
  return ref.watch(authServiceProvider).authStateChanges;
});

final userProvider = FutureProvider<AppUser?>((ref) async {
  final authState = ref.watch(authStateProvider).value;
  if (authState == null) return null;
  return ref.watch(firestoreServiceProvider).getUser(authState.uid);
});

class DemoModeNotifier extends Notifier<bool> {
  @override
  bool build() => false;

  void set(bool value) => state = value;
}

final demoModeProvider = NotifierProvider<DemoModeNotifier, bool>(() => DemoModeNotifier());
