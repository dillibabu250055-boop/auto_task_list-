import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/data_providers.dart';
import '../../services/firestore_service.dart';
import '../patients/patient_profile_screen.dart';

class PatientRosterScreen extends ConsumerWidget {
  const PatientRosterScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final patientsAsync = ref.watch(patientsStreamProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Patient Roster'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () {},
          ),
        ],
      ),
      body: patientsAsync.when(
        data: (patients) => patients.isEmpty
            ? _buildEmptyState(context)
            : ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 16),
                itemCount: patients.length,
                itemBuilder: (context, index) {
                  final patient = patients[index];
                  return _PatientListTile(patient: patient, index: index);
                },
              ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.person_off_rounded, size: 64, color: Colors.white.withAlpha(51)),
          const SizedBox(height: 16),
          Text(
            'No patients assigned yet',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white70),
          ),
        ],
      ),
    );
  }
}

class _PatientListTile extends StatelessWidget {
  final Patient patient;
  final int index;

  const _PatientListTile({required this.patient, required this.index});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        leading: _buildStreakIndicator(patient.adherenceStreak),
        title: Text(
          patient.name,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Row(
              children: [
                const Icon(Icons.location_on_rounded, size: 14, color: Color(0xFF94A3B8)),
                const SizedBox(width: 4),
                Text(patient.village, style: const TextStyle(color: Color(0xFF94A3B8))),
              ],
            ),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: Colors.white.withAlpha(13),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.chevron_right_rounded, color: Colors.white70),
        ),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => PatientProfileScreen(patient: patient),
            ),
          );
        },
      ),
    ).animate().fadeIn(delay: (index * 100).ms).slideX(begin: -0.1, end: 0);
  }

  Widget _buildStreakIndicator(int streak) {
    final bool hasStreak = streak > 0;
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: hasStreak
                  ? [const Color(0xFF10B981), const Color(0xFF34D399)]
                  : [const Color(0xFFEF4444), const Color(0xFFF87171)],
            ),
          ),
          child: const Icon(Icons.person, color: Colors.white),
        ),
        if (hasStreak)
          Positioned(
            right: 0,
            bottom: 0,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: Color(0xFFF59E0B),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.whatshot, size: 12, color: Colors.white),
            ).animate(onPlay: (controller) => controller.repeat())
             .shimmer(duration: 2.seconds, color: Colors.white54),
          ),
      ],
    );
  }
}
