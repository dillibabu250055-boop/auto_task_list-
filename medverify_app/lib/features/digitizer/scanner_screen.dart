import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/ocr_service.dart';
import 'digitizer_state.dart';
import 'verification_form_screen.dart';

class ScannerScreen extends ConsumerStatefulWidget {
  const ScannerScreen({super.key});

  @override
  ConsumerState<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends ConsumerState<ScannerScreen> {
  CameraController? _controller;
  final OCRService _ocrService = OCRService();

  @override
  void initState() {
    super.initState();
    _initializeCamera();
  }

  Future<void> _initializeCamera() async {
    final cameras = await availableCameras();
    if (cameras.isEmpty) return;

    _controller = CameraController(cameras[0], ResolutionPreset.high);
    await _controller!.initialize();
    if (mounted) setState(() {});
  }

  Future<void> _scan() async {
    if (_controller == null || !_controller!.value.isInitialized) return;

    ref.read(digitizerProvider.notifier).setProcessing(true);

    try {
      final image = await _controller!.takePicture();
      final text = await _ocrService.recognizeText(image);
      final parsed = _ocrService.parsePrescription(text);

      ref.read(digitizerProvider.notifier).updateResults(
        medicine: parsed['medicine'] ?? '',
        dosage: parsed['dosage'] ?? '',
        raw: text,
      );

      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const VerificationFormScreen()),
        );
      }
    } catch (e) {
      ref.read(digitizerProvider.notifier).setProcessing(false);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(digitizerProvider);

    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('Scan Prescription'),
        backgroundColor: Colors.transparent,
      ),
      body: Stack(
        children: [
          if (_controller != null && _controller!.value.isInitialized)
            SizedBox.expand(child: CameraPreview(_controller!))
          else
            const Center(child: CircularProgressIndicator()),
          
          // Viewport Frame
          Center(
            child: Container(
              width: MediaQuery.of(context).size.width * 0.85,
              height: MediaQuery.of(context).size.height * 0.3,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white, width: 2),
                borderRadius: BorderRadius.circular(24),
              ),
            ).animate(onPlay: (c) => c.repeat()).shimmer(duration: 2.seconds, color: Colors.blue.withAlpha(77)),
          ),

          // Bottom Controls
          Positioned(
            bottom: 60,
            left: 0,
            right: 0,
            child: Center(
              child: FloatingActionButton.large(
                onPressed: state.isProcessing ? null : _scan,
                backgroundColor: Colors.white,
                child: state.isProcessing 
                  ? const CircularProgressIndicator(color: Colors.black)
                  : const Icon(Icons.camera_alt_rounded, color: Colors.black, size: 36),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
