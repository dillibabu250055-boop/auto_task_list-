import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';

class NetworkStatusBar extends StatelessWidget {
  final bool isOffline;

  const NetworkStatusBar({super.key, required this.isOffline});

  @override
  Widget build(BuildContext context) {
    if (!isOffline) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 16),
      color: Colors.orange.shade900.withAlpha(200),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.cloud_off_rounded, color: Colors.white, size: 14),
          SizedBox(width: 8),
          Text(
            'Working Locally - Changes will sync later',
            style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    ).animate().slideY(begin: -1, end: 0, duration: 400.ms, curve: Curves.easeOut);
  }
}
