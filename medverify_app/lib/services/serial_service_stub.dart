class SerialService {
  bool get isConnected => false;

  List<String> getAvailablePorts() {
    return [];
  }

  bool connect(String portName) {
    return false;
  }

  void disconnect() {}

  void sendMessage(String phone, String message, bool isTamil) {}
}
