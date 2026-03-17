/*
 * MedVerify Connect - Hardware SMS Gateway
 * 
 * Board  : ESP32 (or Arduino Mega/Uno with HardwareSerial)
 * Module : SIM800L GSM Module
 * 
 * Connections:
 *   SIM800L TX -> ESP32 RX2 (GPIO 16)
 *   SIM800L RX -> ESP32 TX2 (GPIO 17)
 *   SIM800L GND -> ESP32/Power GND
 *   SIM800L VCC -> Regulated 4.0V (not 3.3V or 5V, use voltage regulator!)
 *
 * Description:
 *   This firmware continuously listens on the Serial port (USB) for
 *   medicine reminder payloads in the format:
 *     SEND|+91XXXXXXXXXX|<message text>
 *   It then transmits the SMS over GSM using AT commands.
 *
 *   This completely bypasses Twilio/cloud APIs for internet-independent
 *   operation in rural areas.
 *
 *   Supports Tamil (Unicode) by sending SMS in UCS2 mode (AT+CSCS="UCS2").
 */

#include <Arduino.h>
#include <HardwareSerial.h>

// SIM800L is connected to UART2 on ESP32
HardwareSerial SIM800(2);

#define SIM_RX 16
#define SIM_TX 17
#define SIM_BAUD 9600

// ─── Utility: Send AT Command and wait for expected response ─────────────────
bool sendAT(const String& cmd, const String& expected, unsigned long timeout = 3000) {
  SIM800.println(cmd);
  unsigned long start = millis();
  String response = "";
  while (millis() - start < timeout) {
    while (SIM800.available()) {
      char c = SIM800.read();
      response += c;
    }
    if (response.indexOf(expected) != -1) return true;
  }
  Serial.println("[SIM800 Response] " + response);
  return false;
}

// ─── Initialize SIM800L Module ────────────────────────────────────────────────
void initSIM800() {
  Serial.println("[GATEWAY] Initializing SIM800L...");
  SIM800.begin(SIM_BAUD, SERIAL_8N1, SIM_RX, SIM_TX);
  delay(2000);

  // Basic AT handshake
  if (!sendAT("AT", "OK")) {
    Serial.println("[ERROR] SIM800L not responding. Check power/connections.");
    return;
  }
  // Disable echo
  sendAT("ATE0", "OK");
  // Set SMS mode to Text
  sendAT("AT+CMGF=1", "OK");
  // Set preferred message storage to SIM
  sendAT("AT+CPMS=\"SM\",\"SM\",\"SM\"", "OK");
  // Set character set for international (Tamil) support
  // UCS2 allows sending full Unicode text including Tamil script
  sendAT("AT+CSCS=\"UCS2\"", "OK");

  Serial.println("[GATEWAY] SIM800L Ready. Awaiting commands...");
}

// ─── Convert ASCII string to UCS2 hex string (for Tamil/Unicode SMS) ─────────
// For ASCII-only content. Tamil strings must be pre-encoded to UCS2 hex
// by the Flutter app before sending to this gateway.
String toUCS2(const String& text) {
  String ucs2 = "";
  for (int i = 0; i < text.length(); i++) {
    char c = text[i];
    // Pad to 4 hex digits for UCS2
    if (c < 0x10)         ucs2 += "000";
    else if (c < 0x100)   ucs2 += "00";
    else if (c < 0x1000)  ucs2 += "0";
    ucs2 += String(c, HEX);
  }
  ucs2.toUpperCase();
  return ucs2;
}

// ─── Send SMS via AT commands ─────────────────────────────────────────────────
// phoneNumber: E.164 format, e.g. "+919876543210"
// message    : Raw text OR pre-encoded UCS2 hex string
// isUCS2     : true if message is already UCS2 hex (for Tamil/Unicode content)
bool sendSMS(const String& phoneNumber, const String& message, bool isUCS2 = false) {
  Serial.println("[GATEWAY] Sending SMS to: " + phoneNumber);

  // Set encoding mode
  if (isUCS2) {
    if (!sendAT("AT+CSCS=\"UCS2\"", "OK")) return false;
  } else {
    if (!sendAT("AT+CSCS=\"GSM\"", "OK")) return false;
  }

  // Begin SMS destination command
  String cmd = "AT+CMGS=\"" + phoneNumber + "\"";
  SIM800.println(cmd);
  delay(500);

  // Wait for '>' prompt
  unsigned long start = millis();
  String prompt = "";
  while (millis() - start < 5000) {
    while (SIM800.available()) prompt += (char)SIM800.read();
    if (prompt.indexOf('>') != -1) break;
  }

  if (prompt.indexOf('>') == -1) {
    Serial.println("[ERROR] No '>' prompt received.");
    SIM800.write(27); // ESC to cancel
    return false;
  }

  // Send the message body and Ctrl+Z to submit
  SIM800.print(message);
  SIM800.write(26); // Ctrl+Z

  // Wait for +CMGS: response (up to 30s)
  String result = "";
  start = millis();
  while (millis() - start < 30000) {
    while (SIM800.available()) result += (char)SIM800.read();
    if (result.indexOf("+CMGS:") != -1) {
      Serial.println("[GATEWAY] SMS Sent! ID: " + result);
      return true;
    }
    if (result.indexOf("ERROR") != -1) {
      Serial.println("[ERROR] SMS failed: " + result);
      return false;
    }
  }
  Serial.println("[ERROR] SMS send timeout.");
  return false;
}

// ─── Parse incoming Serial command from Flutter app ───────────────────────────
// Expected format: SEND|<phone>|<message>|<ucs2:0or1>
// Example: SEND|+919876543210|Take Blue Tablet now|0
// Tamil Ex: SEND|+919876543210|0BA80BC80BBF 0BAE0BBE0BA4<..hex..>|1
void parseAndDispatch(const String& cmd) {
  if (!cmd.startsWith("SEND|")) {
    Serial.println("[GATEWAY] Unknown command: " + cmd);
    return;
  }

  // Split by '|'
  int p1 = cmd.indexOf('|');
  int p2 = cmd.indexOf('|', p1 + 1);
  int p3 = cmd.indexOf('|', p2 + 1);

  if (p1 == -1 || p2 == -1) {
    Serial.println("[ERROR] Malformed command.");
    return;
  }

  String phone   = cmd.substring(p1 + 1, p2);
  String message = cmd.substring(p2 + 1, (p3 != -1) ? p3 : cmd.length());
  bool   isUCS2  = (p3 != -1) ? (cmd.substring(p3 + 1).toInt() == 1) : false;

  Serial.println("[GATEWAY] Phone: " + phone);
  Serial.println("[GATEWAY] Message: " + message);
  Serial.println("[GATEWAY] UCS2 mode: " + String(isUCS2 ? "Yes" : "No"));

  bool ok = sendSMS(phone, message, isUCS2);
  Serial.println(ok ? "[GATEWAY] SUCCESS" : "[GATEWAY] FAILED");
}

// ─── Arduino Setup ────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  Serial.println("\n[MEDVERIFY CONNECT] Hardware SMS Gateway v1.0");
  Serial.println("============================================");
  initSIM800();
}

// ─── Arduino Loop ─────────────────────────────────────────────────────────────
void loop() {
  // Listen for commands from Flutter app via USB Serial
  if (Serial.available()) {
    String incoming = Serial.readStringUntil('\n');
    incoming.trim();
    if (incoming.length() > 0) {
      parseAndDispatch(incoming);
    }
  }

  // Optional: relay SIM800 debug output back to host
  while (SIM800.available()) {
    Serial.write(SIM800.read());
  }
}
