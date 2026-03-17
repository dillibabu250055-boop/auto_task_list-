import 'serial_service_stub.dart'
    if (dart.library.io) 'serial_service_native.dart';

import 'package:flutter_riverpod/flutter_riverpod.dart';

final serialServiceProvider = Provider((ref) => SerialService());

class ConnectionStatusNotifier extends Notifier<bool> {
  @override
  bool build() {
    return ref.watch(serialServiceProvider).isConnected;
  }

  void set(bool value) => state = value;
}

final connectionStatusProvider = NotifierProvider<ConnectionStatusNotifier, bool>(() {
  return ConnectionStatusNotifier();
});
