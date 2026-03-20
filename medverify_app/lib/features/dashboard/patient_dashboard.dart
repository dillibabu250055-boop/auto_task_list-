import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:ui';
import '../../core/locale_provider.dart';
import '../../services/firestore_service.dart';
import '../digitizer/scanner_screen.dart';
import '../../l10n/app_localizations.dart';
import '../../core/common_widgets/network_status_bar.dart';
import '../../services/auth_service.dart';
import '../settings/hardware_sync_page.dart';

class PatientDashboard extends ConsumerWidget {
  const PatientDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = AppLocalizations.of(context)!;
    final firestoreService = FirestoreService();
    final isDemo = ref.watch(demoModeProvider);

    final userAsync = ref.watch(userProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: Text(l10n.appTitle),
        flexibleSpace: ClipRect(
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
            child: Container(color: Colors.transparent),
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.language),
            onPressed: () => ref.read(localeProvider.notifier).toggleLocale(),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => ref.read(authServiceProvider).signOut(),
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'settings') {
                Navigator.push(context, MaterialPageRoute(builder: (context) => const HardwareSyncPage()));
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'settings', child: Text('Settings / Sync')),
            ],
          ),
        ],
      ),
      body: Stack(
        children: [
          Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(-0.8, -0.6),
                radius: 1.5,
                colors: [Color(0xFF1E293B), Color(0xFF0A0E12)],
              ),
            ),
          ),
          SafeArea(
            child: userAsync.when(
              data: (user) {
                if (user == null) return const Center(child: Text('User not found'));
                
                return Column(
                  children: [
                    NetworkStatusBar(isOffline: isDemo),
                    Expanded(
                      child: SingleChildScrollView(
                        physics: const BouncingScrollPhysics(),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Padding(
                              padding: const EdgeInsets.all(20.0),
                              child: _LifeStreakCard(streak: isDemo ? 7 : user.adherenceStreak), 
                            ).animate().fadeIn(duration: 600.ms).slideY(begin: 0.2, end: 0),
                            
                            if (isDemo || user.adherenceStreak >= 7) 
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 20),
                                child: _DiscountTokenCard(
                                  discount: '10%',
                                  code: 'STREAK${(user.adherenceStreak ~/ 7) * 7}',
                                  pharmacy: 'Local Pharmacy',
                                ),
                              ).animate().fadeIn(delay: 400.ms).scale(),

                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 24),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('My Prescriptions', style: Theme.of(context).textTheme.titleLarge),
                                  TextButton.icon(
                                    icon: const Icon(Icons.medication),
                                    label: const Text('Order Refill'),
                                    onPressed: () {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Refill request sent to Pharmacist!')),
                                      );
                                    },
                                  ),
                                ],
                              ),
                            ).animate().fadeIn(delay: 500.ms),
                            
                            StreamBuilder<List<Prescription>>(
                              stream: firestoreService.streamPrescriptions(user.uid),
                              builder: (context, snapshot) {
                                if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
                                final prescriptions = snapshot.data ?? [];
                                if (prescriptions.isEmpty) {
                                  return const Padding(
                                  padding: EdgeInsets.all(24.0),
                                  child: Center(child: Text('No active prescriptions', style: TextStyle(color: Colors.white54))),
                                );
                                }
                                return ListView.builder(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemCount: prescriptions.length,
                                  itemBuilder: (context, index) {
                                    final p = prescriptions[index];
                                    return _SimplePrescriptionCard(
                                      prescription: p,
                                      onRefill: () async {
                                        final order = MedOrder(
                                          id: '',
                                          patientId: user.uid,
                                          pharmacistId: 'default_pharmacist', // In real app, select from nearby
                                          prescriptionId: p.id,
                                          status: OrderStatus.pending,
                                          discountApplied: user.adherenceStreak >= 7,
                                          createdAt: DateTime.now(),
                                        );
                                        await firestoreService.createOrder(order);
                                        if (context.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(content: Text('Refill request sent to Pharmacy!')),
                                          );
                                        }
                                      },
                                    );
                                  },
                                );
                              },
                            ),
                            
                            Padding(
                              padding: const EdgeInsets.all(24.0),
                              child: _TeleConsultationCard(
                                onRequest: () async {
                                  final appt = Appointment(
                                    id: '',
                                    patientId: user.uid,
                                    doctorId: 'assigned_doctor', // Assigned logic here
                                    status: AppointmentStatus.requested,
                                    type: 'audio-call',
                                    createdAt: DateTime.now(),
                                  );
                                  await firestoreService.requestAppointment(appt);
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Doctor callback requested!')),
                                    );
                                  }
                                },
                              ),
                            ),
                            const SizedBox(height: 100),
                          ],
                        ),
                      ),
                    ),
                  ],
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Center(child: Text('Error: $err')),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const ScannerScreen())),
        label: Text(l10n.scanDocument),
        icon: const Icon(Icons.camera_alt_rounded),
        backgroundColor: const Color(0xFF00B0FF),
        foregroundColor: Colors.white,
      ).animate().scale(delay: 500.ms, curve: Curves.elasticOut),
    );
  }
}

class _LifeStreakCard extends StatelessWidget {
  final int streak;
  const _LifeStreakCard({required this.streak});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: const Color(0xFF10B981).withAlpha(51), width: 2),
      ),
      child: Column(
        children: [
          const Icon(Icons.local_fire_department_rounded, size: 64, color: Color(0xFF10B981)),
          const SizedBox(height: 16),
          Text('$streak Day Streak!', style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
          const Text('Keep taking your medicine to unlock rewards', style: TextStyle(color: Color(0xFF94A3B8))),
          const SizedBox(height: 24),
          LinearProgressIndicator(
            value: (streak % 7) / 7,
            backgroundColor: Colors.white10,
            color: const Color(0xFF10B981),
            borderRadius: BorderRadius.circular(8),
            minHeight: 12,
          ),
        ],
      ),
    );
  }
}

class _DiscountTokenCard extends StatelessWidget {
  final String discount;
  final String code;
  final String pharmacy;

  const _DiscountTokenCard({required this.discount, required this.code, required this.pharmacy});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFD97706)]),
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        children: [
          const CircleAvatar(
            backgroundColor: Colors.white24,
            child: Icon(Icons.confirmation_number_rounded, color: Colors.white),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$discount Pharmacy Discount', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                Text('Valid at $pharmacy', style: const TextStyle(color: Colors.white70, fontSize: 12)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
            child: Text(code, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
          ),
        ],
      ),
    );
  }
}

class _SimplePrescriptionCard extends StatelessWidget {
  final Prescription prescription;
  final VoidCallback onRefill;
  const _SimplePrescriptionCard({required this.prescription, required this.onRefill});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      child: ListTile(
        leading: const Icon(Icons.medication_rounded, color: Color(0xFF00B0FF)),
        title: Text(prescription.medicineName, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(prescription.dosageInstructions),
        trailing: IconButton(
          icon: const Icon(Icons.shopping_cart_checkout_rounded, color: Color(0xFF00B0FF)),
          onPressed: onRefill,
          tooltip: 'Order Refill',
        ),
      ),
    );
  }
}

class _TeleConsultationCard extends StatelessWidget {
  final VoidCallback onRequest;
  const _TeleConsultationCard({required this.onRequest});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Need Medical Advice?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
          const Text('Chat or call with your doctor instantly', style: TextStyle(color: Color(0xFF94A3B8))),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: onRequest,
            icon: const Icon(Icons.video_call_rounded),
            label: const Text('Request Consultation'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF00B0FF).withAlpha(26),
              foregroundColor: const Color(0xFF00B0FF),
            ),
          ),
        ],
      ),
    );
  }
}
