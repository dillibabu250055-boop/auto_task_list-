import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/firestore_service.dart';
import '../../services/auth_service.dart';
import '../../core/providers/data_providers.dart';
import 'digitizer_state.dart';

class VerificationFormScreen extends ConsumerStatefulWidget {
  const VerificationFormScreen({super.key});

  @override
  ConsumerState<VerificationFormScreen> createState() => _VerificationFormScreenState();
}

class _VerificationFormScreenState extends ConsumerState<VerificationFormScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _medicineController;
  late TextEditingController _dosageController;
  String? _selectedPatientId;

  @override
  void initState() {
    super.initState();
    final state = ref.read(digitizerProvider);
    _medicineController = TextEditingController(text: state.medicineName);
    _dosageController = TextEditingController(text: state.dosage);
  }

  @override
  void dispose() {
    _medicineController.dispose();
    _dosageController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate() || _selectedPatientId == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a patient and fill all fields')));
      return;
    }

    final firestore = ref.read(firestoreServiceProvider);
    final state = ref.read(digitizerProvider);

    final user = ref.read(userProvider).value;
    final prescription = Prescription(
      id: "",
      patientId: _selectedPatientId!,
      doctorId: user?.uid ?? 'scanner_ocr',
      medicineName: _medicineController.text,
      dosageInstructions: _dosageController.text,
      frequency: "As prescribed",
      duration: "Ongoing",
      rawOcrText: state.rawText,
      isDigital: false,
      createdAt: DateTime.now(),
    );

    try {
      await firestore.addPrescription(prescription);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Prescription saved successfully')));
        ref.read(digitizerProvider.notifier).reset();
        Navigator.popUntil(context, (route) => route.isFirst);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final patientsAsync = ref.watch(patientsStreamProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Verify Prescription')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Assign to Patient', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 12),
              patientsAsync.when(
                data: (patients) => DropdownButtonFormField<String>(
                  initialValue: _selectedPatientId,
                  decoration: _inputDecoration('Select Patient', Icons.person_outline),
                  items: patients.map((p) => DropdownMenuItem(value: p.id, child: Text(p.name))).toList(),
                  onChanged: (val) => setState(() => _selectedPatientId = val),
                  validator: (val) => val == null ? 'Patient required' : null,
                ),
                loading: () => const LinearProgressIndicator(),
                error: (e, s) => const Text('Error loading patients'),
              ),
              const SizedBox(height: 24),
              _buildField('Medicine Name', _medicineController, Icons.medication_rounded),
              const SizedBox(height: 16),
              _buildField('Dosage Instructions', _dosageController, Icons.description_rounded, maxLines: 3),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _save,
                  child: const Text('Confirm & Save'),
                ),
              ).animate().fadeIn(delay: 400.ms),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller, IconData icon, {int maxLines = 1}) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      decoration: _inputDecoration(label, icon),
      validator: (val) => val == null || val.isEmpty ? 'Required' : null,
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, color: const Color(0xFF00B0FF)),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
    );
  }
}
