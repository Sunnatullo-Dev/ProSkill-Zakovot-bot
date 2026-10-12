import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/router/app_routes.dart';

class ZakovatTableJoinPage extends StatefulWidget {
  const ZakovatTableJoinPage({super.key});

  @override
  State<ZakovatTableJoinPage> createState() => _ZakovatTableJoinPageState();
}

class _ZakovatTableJoinPageState extends State<ZakovatTableJoinPage> {
  final _codeController = TextEditingController();

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  void _join() {
    final code = _codeController.text.trim();
    if (code.isEmpty) return;
    context.push(AppRoutes.zakovatTableRoom(code));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Zakovat Stoli'),
        centerTitle: true,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🔴', style: TextStyle(fontSize: 64)),
              const SizedBox(height: 16),
              const Text(
                'Jonli Zakovat Stoli',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                '6 nafar bilimdon, 12 sektorli aylanuvchi stol va tomoshabinlar bilan o\'yinni jonli kuzating.',
                style: TextStyle(color: Colors.white60, fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              TextField(
                controller: _codeController,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, letterSpacing: 2),
                decoration: InputDecoration(
                  labelText: 'STOL RAQAMI (masalan: 7845)',
                  floatingLabelAlignment: FloatingLabelAlignment.center,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 24),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: _join,
                child: const Text(
                  'Stolga Qo\'shilish / Kuzatish',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
