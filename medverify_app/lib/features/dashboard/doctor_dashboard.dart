import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import '../../core/providers/data_providers.dart';

class DoctorDashboard extends ConsumerWidget {
  const DoctorDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(userProvider);
    final firestore = ref.watch(firestoreServiceProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: userAsync.when(
        data: (user) {
          if (user == null) return const Center(child: CircularProgressIndicator());

          return CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              _buildHeader(context, user, ref),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Patient Consultations',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      ElevatedButton.icon(
                        onPressed: () => _showPrescriptionPad(context, ref, user.uid),
                        icon: const Icon(Icons.add_task_rounded),
                        label: const Text('New E-Prescription'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00B0FF),
                          foregroundColor: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              StreamBuilder<List<Appointment>>(
                stream: firestore.streamAppointments(doctorId: user.uid),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const SliverToBoxAdapter(child: Center(child: CircularProgressIndicator()));
                  }
                  final appts = snapshot.data ?? [];
                  if (appts.isEmpty) {
                    return const SliverToBoxAdapter(
                      child: Center(
                        child: Padding(
                          padding: EdgeInsets.all(48.0),
                          child: Text('No pending requests', style: TextStyle(color: Colors.white54)),
                        ),
                      ),
                    );
                  }

                  return SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final appt = appts[index];
                          return _AppointmentCard(
                            appointment: appt,
                            onStatusUpdate: (status) => firestore.updateAppointmentStatus(appt.id, status),
                          ).animate().fadeIn(delay: (index * 100).ms).slideX();
                        },
                        childCount: appts.length,
                      ),
                    ),
                  );
                },
              ),
              const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, AppUser user, WidgetRef ref) {
    return SliverAppBar(
      expandedHeight: 180,
      pinned: true,
      backgroundColor: const Color(0xFF1E293B),
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF00B0FF), Color(0xFF0081CB)],
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Professional Portal', style: TextStyle(color: Colors.white70)),
                Text(
                  'Dr. ${user.name}',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        IconButton(
          onPressed: () => ref.read(authServiceProvider).signOut(),
          icon: const Icon(Icons.logout_rounded, color: Colors.white),
        ),
      ],
    );
  }

  void _showPrescriptionPad(BuildContext context, WidgetRef ref, String doctorId) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _DigitalPrescriptionPad(doctorId: doctorId),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  final Appointment appointment;
  final Function(AppointmentStatus) onStatusUpdate;

  const _AppointmentCard({required this.appointment, required this.onStatusUpdate});

  @override
  Widget build(BuildContext context) {
    final bool isRequested = appointment.status == AppointmentStatus.requested;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withAlpha(isRequested ? 51 : 12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                appointment.type.toUpperCase(),
                style: TextStyle(
                  color: isRequested ? const Color(0xFF00B0FF) : Colors.white54,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  letterSpacing: 1.2,
                ),
              ),
              _StatusBadge(status: appointment.status),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Patient: ${appointment.patientId}', // Should ideally show name
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
          ),
          const SizedBox(height: 4),
          Text(
            'Requested: ${appointment.createdAt.hour}:${appointment.createdAt.minute}',
            style: const TextStyle(color: Colors.white54, fontSize: 12),
          ),
          const SizedBox(height: 20),
          if (isRequested)
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => onStatusUpdate(AppointmentStatus.cancelled),
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.white60),
                    child: const Text('Decline'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => onStatusUpdate(AppointmentStatus.scheduled),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00B0FF), foregroundColor: Colors.white),
                    child: const Text('Accept Call'),
                  ),
                ),
              ],
            )
          else if (appointment.status == AppointmentStatus.scheduled)
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => onStatusUpdate(AppointmentStatus.completed),
                icon: const Icon(Icons.check_circle_rounded),
                label: const Text('Mark as Completed'),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final AppointmentStatus status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color = Colors.white24;
    if (status == AppointmentStatus.requested) color = const Color(0xFF00B0FF);
    if (status == AppointmentStatus.scheduled) color = const Color(0xFFFBBF24);
    if (status == AppointmentStatus.completed) color = const Color(0xFF10B981);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status.name.toUpperCase(),
        style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.bold),
      ),
    );
  }
}

class _DigitalPrescriptionPad extends ConsumerStatefulWidget {
  final String doctorId;
  const _DigitalPrescriptionPad({required this.doctorId});

  @override
  ConsumerState<_DigitalPrescriptionPad> createState() => _DigitalPrescriptionPadState();
}

class _DigitalPrescriptionPadState extends ConsumerState<_DigitalPrescriptionPad> {
  final _formKey = GlobalKey<FormState>();
  final _patientController = TextEditingController();
  final _medicineController = TextEditingController();
  final _dosageController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: 24, left: 24, right: 24,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF1E293B),
        borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'E-Prescription Pad',
              style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 24),
            _buildField('Patient ID', _patientController, Icons.person_rounded),
            const SizedBox(height: 16),
            _buildField('Medicine Name', _medicineController, Icons.medication_rounded),
            const SizedBox(height: 16),
            _buildField('Instructions', _dosageController, Icons.description_rounded, maxLines: 2),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton(
                onPressed: _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00B0FF),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('Issue Digital Prescription', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller, IconData icon, {int maxLines = 1}) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.white54),
        prefixIcon: Icon(icon, color: const Color(0xFF00B0FF)),
        filled: true,
        fillColor: Colors.white.withAlpha(12),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
      ),
      validator: (val) => val == null || val.isEmpty ? 'Required' : null,
    );
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final firestore = ref.read(firestoreServiceProvider);
    final prescription = Prescription(
      id: '',
      patientId: _patientController.text,
      doctorId: widget.doctorId,
      medicineName: _medicineController.text,
      dosageInstructions: _dosageController.text,
      frequency: 'As Prescribed',
      duration: '7 Days',
      isDigital: true,
      createdAt: DateTime.now(),
    );

    await firestore.addPrescription(prescription);
    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Prescription issued successfully!')),
      );
    }
  }
}
