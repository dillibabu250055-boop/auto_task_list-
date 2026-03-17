# Hardware SMS Gateway — README

## Overview
This Arduino/ESP32 sketch (`sim800l_gateway.ino`) implements a standalone cellular SMS gateway for MedVerify Connect. It **bypasses all internet-based SMS APIs** (Twilio, etc.) and sends messages directly over GSM.

## Hardware Required
| Component | Qty |
|---|---|
| ESP32 Dev Board (or Arduino Mega) | 1 |
| SIM800L GSM Module | 1 |
| 3.7V–4.2V LiPo battery or regulated 4V supply | 1 |
| Active SIM card (local carrier, SMS-enabled) | 1 |
| Jumper wires | several |

## Wiring
```
SIM800L TX  →  ESP32 GPIO16 (RX2)
SIM800L RX  →  ESP32 GPIO17 (TX2)
SIM800L GND →  Common GND
SIM800L VCC →  4.0V regulated (use LM2596 or similar — DO NOT use 3.3V or 5V directly)
```

## Flashing
1. Install the [Arduino IDE](https://www.arduino.cc/en/software) or PlatformIO.
2. Add ESP32 board support: `https://dl.espressif.com/dl/package_esp32_index.json`
3. Open `sim800l_gateway.ino`, select your board (e.g. *ESP32 Dev Module*) and COM port.
4. Click **Upload**.

## Command Protocol
The Flutter app communicates via USB Serial at **115200 baud** using this format:
```
SEND|<E.164 phone>|<message text>|<ucs2_flag>
```
- `ucs2_flag` = `0` for English (GSM 7-bit), `1` for Tamil/Unicode (UCS2 encoded hex)

### Examples
**English:**
```
SEND|+919876543210|Take Blue Tablet (Diabetes) - Morning 9:00 AM - After Food|0
```

**Tamil (UCS2 hex encoded by Flutter):**
```
SEND|+919876543210|0BA80BC80BBF0020...|1
```

## Tamil SMS Support
Tamil uses Unicode characters outside the standard GSM 7-bit character set. The SIM800L supports this via `AT+CSCS="UCS2"` mode. The Flutter app is responsible for converting Tamil strings to UCS2 hex before sending to this gateway.

Example Tamil payload:
> `நீல மாத்திரை (சர்க்கரை) காலை 9:00 - உணவுக்கு பின் எடுக்கவும்`

This will be encoded to UCS2 hex and transmitted at the 160-char UCS2 SMS limit (70 characters per segment in Unicode mode).
