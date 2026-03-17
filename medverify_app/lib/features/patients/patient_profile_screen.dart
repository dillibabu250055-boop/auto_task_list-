import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'dart:ui';
import '../../services/firestore_service.dart';
import '../../core/providers/data_providers.dart';

class PatientProfileScreen extends ConsumerWidget {
  final Patient patient;

  const PatientProfileScreen({super.key, required this.patient});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prescriptionsAsync = ref.watch(prescriptionsStreamProvider(patient.id));
    final missedDosesAsync = ref.watch(missedDosesStreamProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Text(patient.name),
        flexibleSpace: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(color: Colors.transparent),
          ),
        ),
      ),
      body: Stack(
        children: [
          Container(color: const Color(0xFF0F172A)),
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.only(bottom: 100),
              child: Column(
                children: [
                  _PatientHeroHeader(patient: patient),
                  const SizedBox(height: 24),
                  _buildSectionTitle(context, 'Medication Timeline'),
                  _buildTimeline(missedDosesAsync),
                  const SizedBox(height: 32),
                  _buildSectionTitle(context, 'Prescriptions'),
                  _buildPrescriptionList(prescriptionsAsync),
                ],
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        label: const Text('Add Prescription'),
        icon: const Icon(Icons.add_rounded),
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Text(
          title,
          style: Theme.of(context).textTheme.titleLarge,
        ),
      ),
    ).animate().fadeIn(delay: 200.ms);
  }

  Widget _buildTimeline(AsyncValue<List<DoseEvent>> missedDosesAsync) {
    return missedDosesAsync.when(
      data: (doses) {
        final patientDoses = doses.where((d) => d.patientId == patient.id).toList();
        return Container(
          height: 120,
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: 7, // Last 7 days
            itemBuilder: (context, index) {
              final date = DateTime.now().subtract(Duration(days: 6 - index));
              final hasMissed = patientDoses.any((d) => 
                d.scheduledAt.year == date.year && 
                d.scheduledAt.month == date.month && 
                d.scheduledAt.day == date.day
              );
              return _TimelineDayCard(date: date, isAlert: hasMissed);
            },
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, s) => Text('Error: $e'),
    );
  }

  Widget _buildPrescriptionList(AsyncValue<List<Prescription>> prescriptionsAsync) {
    return prescriptionsAsync.when(
      data: (prescriptions) => prescriptions.isEmpty
          ? const Center(child: Text('No active prescriptions', style: TextStyle(color: Colors.white54)))
          : ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: prescriptions.length,
              itemBuilder: (context, index) {
                final p = prescriptions[index];
                return _PrescriptionCard(prescription: p);
              },
            ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, s) => Text('Error: $e'),
    );
  }
}

class _PatientHeroHeader extends StatelessWidget {
  final Patient patient;
  const _PatientHeroHeader({required this.patient});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: const Color(0xFF00B0FF).withValues(alpha: 0.1),
                child: Text(patient.name[0], style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFF00B0FF))),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(patient.name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
                    Text(patient.village, style: const TextStyle(color: Color(0xFF94A3B8))),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _StatBadge(label: 'Streak', value: '${patient.adherenceStreak}d', color: const Color(0xFF10B981)),
              _StatBadge(label: 'Missed', value: '${patient.missedDoses}', color: const Color(0xFFF43F5E)),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatBadge extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatBadge({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
      ],
    );
  }
}

class _TimelineDayCard extends StatelessWidget {
  final DateTime date;
  final bool isAlert;

  const _TimelineDayCard({required this.date, required this.isAlert});

  @override
  Widget build(BuildContext context) {
    final isToday = DateUtils.isSameDay(date, DateTime.now());
    return Container(
      width: 64,
      margin: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
      decoration: BoxDecoration(
        color: isToday ? const Color(0xFF00B0FF) : Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: isAlert ? Border.all(color: const Color(0xFFF43F5E), width: 2) : null,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(DateFormat('EEE').format(date), style: TextStyle(color: isToday ? Colors.white : Colors.white70, fontSize: 12)),
          Text(DateFormat('dd').format(date), style: TextStyle(color: isToday ? Colors.white : Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
          if (isAlert) const Icon(Icons.warning_amber_rounded, size: 12, color: Color(0xFFF43F5E)),
        ],
      ),
    );
  }
}

class _PrescriptionCard extends StatelessWidget {
  final Prescription prescription;
  const _PrescriptionCard({required this.prescription});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.medication_rounded, color: Color(0xFF00B0FF)),
                const SizedBox(width: 12),
                Text(prescription.medicineName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 12),
            Text(prescription.dosageInstructions, style: const TextStyle(color: Colors.white70)),
            const Divider(height: 32, color: Colors.white12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Freq: ${prescription.frequency}', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                Text('Dur: ${prescription.duration}', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
