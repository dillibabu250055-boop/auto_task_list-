import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';
import 'package:camera/camera.dart';

class OCRService {
  final TextRecognizer _textRecognizer = TextRecognizer(script: TextRecognitionScript.latin);

  Future<String> recognizeText(XFile imageFile) async {
    final InputImage inputImage = InputImage.fromFilePath(imageFile.path);
    final RecognizedText recognizedText = await _textRecognizer.processImage(inputImage);
    
    return recognizedText.text;
  }

  /// Basic parser to extract medicine details (simplified for MVP)
  Map<String, String> parsePrescription(String rawText) {
    final lines = rawText.split('\n');
    String medicine = "";
    String dosage = "";

    // Heuristics: Look for common medicine suffixes or measurement units
    final medRegex = RegExp(r'.*(Tab|Cap|Syr|Inj|Mg|Ml|G).*', caseSensitive: false);
    final dosageRegex = RegExp(r'.*(Take|Once|Twice|Thrice|Daily|Day|Hours|Hour).*', caseSensitive: false);

    for (var line in lines) {
      final trimmed = line.trim();
      if (trimmed.isEmpty) continue;

      if (medicine.isEmpty && medRegex.hasMatch(trimmed)) {
        medicine = trimmed;
      } else if (dosageRegex.hasMatch(trimmed)) {
        dosage += (dosage.isEmpty ? "" : ", ") + trimmed;
      }
    }

    // Fallback if no match
    if (medicine.isEmpty && lines.isNotEmpty) medicine = lines[0].trim();

    return {
      'medicine': medicine,
      'dosage': dosage,
    };
  }

  void dispose() {
    _textRecognizer.close();
  }
}
