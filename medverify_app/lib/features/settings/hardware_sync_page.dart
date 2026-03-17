import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/serial_service.dart';

class HardwareSyncPage extends ConsumerStatefulWidget {
  const HardwareSyncPage({super.key});

  @override
  ConsumerState<HardwareSyncPage> createState() => _HardwareSyncPageState();
}

class _HardwareSyncPageState extends ConsumerState<HardwareSyncPage> {
  String? _selectedPort;

  @override
  Widget build(BuildContext context) {
    final serial = ref.watch(serialServiceProvider);
    final isConnected = ref.watch(connectionStatusProvider);
    final ports = serial.getAvailablePorts();

    return Scaffold(
      appBar: AppBar(title: const Text('Hardware Sync Status')),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildStatusCard(isConnected),
            const SizedBox(height: 32),
            const Text('Available Ports', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            if (ports.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.all(20), child: Text('No devices detected. Check USB connection.')))
            else
              ListView.builder(
                shrinkWrap: true,
                itemCount: ports.length,
                itemBuilder: (context, index) => ListTile(
                  title: Text(ports[index]),
                  leading: const Icon(Icons.usb_rounded),
                  trailing: _selectedPort == ports[index] 
                    ? const Icon(Icons.check_circle, color: Colors.blue) 
                    : null,
                  onTap: () => setState(() => _selectedPort = ports[index]),
                ),
              ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _selectedPort == null 
                  ? null 
                  : () {
                      if (isConnected) {
                        serial.disconnect();
                        ref.read(connectionStatusProvider.notifier).set(false);
                      } else {
                        final success = serial.connect(_selectedPort!);
                        ref.read(connectionStatusProvider.notifier).set(success);
                        if (!success) {
                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to connect to port')));
                        }
                      }
                    },
                style: ElevatedButton.styleFrom(
                  backgroundColor: isConnected ? Colors.red.withAlpha(26) : const Color(0xFF00B0FF),
                  foregroundColor: isConnected ? Colors.red : Colors.white,
                ),
                child: Text(isConnected ? 'Disconnect Gateway' : 'Sync SMS Gateway'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusCard(bool isConnected) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isConnected ? Colors.green.withAlpha(26) : Colors.red.withAlpha(26),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: isConnected ? Colors.green.withAlpha(51) : Colors.red.withAlpha(51)),
      ),
      child: Row(
        children: [
          Icon(
            isConnected ? Icons.cloud_done_rounded : Icons.cloud_off_rounded,
            size: 48,
            color: isConnected ? Colors.green : Colors.red,
          ),
          const SizedBox(width: 20),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                isConnected ? 'Gateway Online' : 'Gateway Offline',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: isConnected ? Colors.green : Colors.red),
              ),
              const Text('SIM800L Connected via ESP32', style: TextStyle(color: Colors.white70)),
            ],
          ),
        ],
      ),
    );
  }
}
