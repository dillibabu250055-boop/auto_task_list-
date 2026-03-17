import 'dart:typed_data';
import 'package:flutter_libserialport/flutter_libserialport.dart';

class SerialService {
  SerialPort? _port;
  bool _isConnected = false;

  bool get isConnected => _isConnected;

  List<String> getAvailablePorts() {
    return SerialPort.availablePorts;
  }

  bool connect(String portName) {
    _port = SerialPort(portName);
    if (_port!.openReadWrite()) {
      _port!.config.baudRate = 115200;
      _isConnected = true;
      return true;
    }
    return false;
  }

  void disconnect() {
    _port?.close();
    _isConnected = false;
  }

  void sendMessage(String phone, String message, bool isTamil) {
    if (!_isConnected || _port == null) return;

    final ucs2Flag = isTamil ? '1' : '0';
    final payload = "SEND|$phone|$message|$ucs2Flag\n";
    _port!.write(Uint8List.fromList(payload.codeUnits));
  }
}
