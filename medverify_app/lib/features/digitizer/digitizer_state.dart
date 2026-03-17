import 'package:flutter_riverpod/flutter_riverpod.dart';

class DigitizerState {
  final String medicineName;
  final String dosage;
  final String rawText;
  final bool isProcessing;

  DigitizerState({
    this.medicineName = '',
    this.dosage = '',
    this.rawText = '',
    this.isProcessing = false,
  });

  DigitizerState copyWith({
    String? medicineName,
    String? dosage,
    String? rawText,
    bool? isProcessing,
  }) {
    return DigitizerState(
      medicineName: medicineName ?? this.medicineName,
      dosage: dosage ?? this.dosage,
      rawText: rawText ?? this.rawText,
      isProcessing: isProcessing ?? this.isProcessing,
    );
  }
}

class DigitizerNotifier extends Notifier<DigitizerState> {
  @override
  DigitizerState build() => DigitizerState();

  void updateResults({required String medicine, required String dosage, required String raw}) {
    state = state.copyWith(
      medicineName: medicine,
      dosage: dosage,
      rawText: raw,
      isProcessing: false,
    );
  }

  void setProcessing(bool value) {
    state = state.copyWith(isProcessing: value);
  }

  void reset() {
    state = DigitizerState();
  }
}

final digitizerProvider = NotifierProvider<DigitizerNotifier, DigitizerState>(() {
  return DigitizerNotifier();
});
