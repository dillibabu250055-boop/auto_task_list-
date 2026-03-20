import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/data_providers.dart';
import '../../services/firestore_service.dart';

class ComplianceDashboard extends ConsumerWidget {
  const ComplianceDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final missedDosesAsync = ref.watch(missedDosesStreamProvider);
    final patientsAsync = ref.watch(patientsStreamProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Compliance Overview')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildGlobalProgress(patientsAsync),
            const SizedBox(height: 32),
            Text('Attention Required', style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 16),
            missedDosesAsync.when(
              data: (doses) => doses.isEmpty
                  ? _buildAllClear()
                  : ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: doses.length,
                      itemBuilder: (context, index) => _MissedDoseCard(dose: doses[index]),
                    ),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, s) => Text('Error: $e'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGlobalProgress(AsyncValue<List<Patient>> patientsAsync) {
    return patientsAsync.when(
      data: (patients) {
        if (patients.isEmpty) return const SizedBox.shrink();
        final avgStreak = patients.map((e) => e.adherenceStreak).reduce((a, b) => a + b) / patients.length;
        
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Color(0xFF0D47A1), Color(0xFF00B0FF)]),
            borderRadius: BorderRadius.circular(32),
          ),
          child: Row(
            children: [
              _buildProgressCircle(avgStreak / 30), // 30 day target
              const SizedBox(width: 24),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Team Performance', style: TextStyle(color: Colors.white70)),
                    const SizedBox(height: 4),
                    Text(
                      '${avgStreak.toStringAsFixed(1)} Day Avg Streak',
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 8),
                    const LinearProgressIndicator(value: 0.8, backgroundColor: Colors.white24, color: Colors.white),
                  ],
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const LinearProgressIndicator(),
      error: (e, s) => const SizedBox.shrink(),
    );
  }

  Widget _buildProgressCircle(double value) {
    return Stack(
      alignment: Alignment.center,
      children: [
        SizedBox(
          width: 80,
          height: 80,
          child: CircularProgressIndicator(
            value: value.clamp(0.0, 1.0),
            backgroundColor: Colors.white24,
            color: Colors.white,
            strokeWidth: 8,
          ),
        ),
        const Icon(Icons.trending_up_rounded, color: Colors.white, size: 32),
      ],
    ).animate().scale(duration: 800.ms, curve: Curves.elasticOut);
  }

  Widget _buildAllClear() {
    return Container(
      padding: const EdgeInsets.all(32),
      width: double.infinity,
      decoration: BoxDecoration(
        color: const Color(0xFF10B981).withAlpha(26),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFF10B981).withAlpha(51)),
      ),
      child: const Column(
        children: [
          Icon(Icons.check_circle_outline_rounded, size: 48, color: Color(0xFF10B981)),
          SizedBox(height: 16),
          Text('All patients are on track!', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
        ],
      ),
    ).animate().fadeIn();
  }
}

class _MissedDoseCard extends ConsumerWidget {
  final DoseEvent dose;
  const _MissedDoseCard({required this.dose});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // We would fetch the patient name here using another provider
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: const CircleAvatar(backgroundColor: Color(0xFFEF4444), child: Icon(Icons.priority_high, color: Colors.white)),
        title: const Text('Missed Dose Alert'),
        subtitle: Text('Scheduled for ${dose.scheduledAt.hour}:${dose.scheduledAt.minute}'),
        trailing: TextButton(onPressed: () {}, child: const Text('Detail')),
      ),
    );
  }
}
