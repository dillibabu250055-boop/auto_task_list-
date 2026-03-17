import 'package:libserialport/libserialport.dart';
import 'dart:convert';
import 'dart:typed_data';

class SMSSerialService {
  SerialPort? _port;

  /// Find and open the first available USB-Serial port (expected to be the ESP32)
  bool initialize() {
    final availablePorts = SerialPort.availablePorts;
    if (availablePorts.isEmpty) return false;

    // Typically the ESP32 will show up as COMx or /dev/ttyUSBx
    // In this MVP we just pick the first one for simplicity.
    _port = SerialPort(availablePorts.first);
    
    if (!_port!.openReadWrite()) {
      return false;
    }

    _port!.config = SerialPortConfig()
      ..baudRate = 115200
      ..bits = 8
      ..stopBits = 1
      ..parity = SerialPortParity.none;

    return true;
  }

  /// Send the SMS command to the hardware gateway.
  /// Format: SEND|`<phone>`|`<message>`|`<ucs2:0or1>`
  void sendSMS(String phone, String message, {bool isTamil = false}) {
    if (_port == null || !_port!.isOpen) return;

    String payload = "SEND|$phone|$message|${isTamil ? 1 : 0}\n";
    _port!.write(Uint8List.fromList(utf8.encode(payload)));
  }

  /// Helper to convert Tamil string to UCS2 hex (as expected by SIM800L C firmware)
  static String toUCS2Hex(String text) {
    StringBuffer sb = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      int code = text.codeUnitAt(i);
      sb.write(code.toRadixString(16).padLeft(4, '0').toUpperCase());
    }
    return sb.toString();
  }

  void dispose() {
    _port?.close();
  }
}
