import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/auth_service.dart';
import '../../services/firestore_service.dart';
import '../../services/sms_trigger_service.dart';
import '../../core/providers/data_providers.dart';

class PharmacistDashboard extends ConsumerWidget {
  const PharmacistDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(userProvider);
    final firestore = ref.watch(firestoreServiceProvider);

    // Start SMS Trigger Service for the logged in Pharmacist
    userAsync.whenData((user) {
      if (user != null && user.role == UserRole.pharmacist) {
        ref.read(smsTriggerServiceProvider).startListening(user.uid);
      }
    });

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
                  child: Text(
                    'Order Management',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                  ),
                ),
              ),
              StreamBuilder<List<MedOrder>>(
                stream: firestore.streamOrders(pharmacistId: user.uid),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const SliverToBoxAdapter(child: Center(child: CircularProgressIndicator()));
                  }
                  final orders = snapshot.data ?? [];
                  if (orders.isEmpty) {
                    return const SliverToBoxAdapter(
                      child: Center(
                        child: Padding(
                          padding: EdgeInsets.all(48.0),
                          child: Text('No active orders', style: TextStyle(color: Colors.white54)),
                        ),
                      ),
                    );
                  }

                  return SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        _OrderKanbanSection(
                          title: 'PENDING',
                          orders: orders.where((o) => o.status == OrderStatus.pending).toList(),
                          color: const Color(0xFF38BDF8),
                          onStatusUpdate: (id, status) => firestore.updateOrderStatus(id, status),
                        ),
                        const SizedBox(height: 24),
                        _OrderKanbanSection(
                          title: 'PACKING',
                          orders: orders.where((o) => o.status == OrderStatus.packing).toList(),
                          color: const Color(0xFFFBBF24),
                          onStatusUpdate: (id, status) => firestore.updateOrderStatus(id, status),
                        ),
                        const SizedBox(height: 24),
                        _OrderKanbanSection(
                          title: 'READY FOR PICKUP',
                          orders: orders.where((o) => o.status == OrderStatus.ready).toList(),
                          color: const Color(0xFF34D399),
                          onStatusUpdate: (id, status) => firestore.updateOrderStatus(id, status),
                        ),
                        const SizedBox(height: 100),
                      ]),
                    ),
                  );
                },
              ),
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
      expandedHeight: 200,
      pinned: true,
      backgroundColor: const Color(0xFF1E293B),
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                right: -20,
                top: -20,
                child: Icon(Icons.medication_liquid_rounded, size: 200, color: Colors.white.withAlpha(12)),
              ),
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Welcome, Pharmacy!',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(color: Colors.white70),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      user.name,
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                    ),
                    const SizedBox(height: 12),
                    _ReputationBadge(rating: user.reputation),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.logout_rounded, color: Colors.white),
          onPressed: () => ref.read(authServiceProvider).signOut(),
        ),
      ],
    );
  }
}

class _ReputationBadge extends StatelessWidget {
  final double rating;
  const _ReputationBadge({required this.rating});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white10,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white24),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.star_rounded, color: Color(0xFFFBBF24), size: 18),
          const SizedBox(width: 4),
          Text(
            rating.toStringAsFixed(1),
            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
          ),
          const SizedBox(width: 8),
          const Text('Top Rated', style: TextStyle(color: Colors.white54, fontSize: 12)),
        ],
      ),
    );
  }
}

class _OrderKanbanSection extends StatelessWidget {
  final String title;
  final List<MedOrder> orders;
  final Color color;
  final Function(String, OrderStatus) onStatusUpdate;

  const _OrderKanbanSection({
    required this.title,
    required this.orders,
    required this.color,
    required this.onStatusUpdate,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
            Text(
              '$title (${orders.length})',
              style: TextStyle(color: color, fontWeight: FontWeight.bold, letterSpacing: 1.2),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (orders.isEmpty)
          const Padding(
            padding: EdgeInsets.only(left: 20, top: 8),
            child: Text('Empty', style: TextStyle(color: Colors.white24, fontSize: 12)),
          )
        else
          ...orders.map((order) => _OrderCard(order: order, onStatusUpdate: onStatusUpdate).animate().fadeIn().slideX()),
      ],
    );
  }
}

class _OrderCard extends StatelessWidget {
  final MedOrder order;
  final Function(String, OrderStatus) onStatusUpdate;

  const _OrderCard({required this.order, required this.onStatusUpdate});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withAlpha(12)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Order #${order.id.substring(0, 5).toUpperCase()}', 
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              if (order.discountApplied)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withAlpha(26),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.discount_rounded, size: 12, color: Color(0xFF10B981)),
                      SizedBox(width: 4),
                      Text('STREAK DISCOUNT', style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Patient ID: ${order.patientId}', style: const TextStyle(color: Colors.white54, fontSize: 12)),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: _buildActions(),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildActions() {
    switch (order.status) {
      case OrderStatus.pending:
        return [
          ElevatedButton(
            onPressed: () => onStatusUpdate(order.id, OrderStatus.packing),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF38BDF8), foregroundColor: Colors.white),
            child: const Text('Accept & Pack'),
          ),
        ];
      case OrderStatus.packing:
        return [
          ElevatedButton(
            onPressed: () => onStatusUpdate(order.id, OrderStatus.ready),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFBBF24), foregroundColor: Colors.black),
            child: const Text('Mark Ready'),
          ),
        ];
      case OrderStatus.ready:
        return [
          ElevatedButton(
            onPressed: () => onStatusUpdate(order.id, OrderStatus.completed),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF34D399), foregroundColor: Colors.white),
            child: const Text('Record Handover'),
          ),
        ];
      default:
        return [];
    }
  }
}
