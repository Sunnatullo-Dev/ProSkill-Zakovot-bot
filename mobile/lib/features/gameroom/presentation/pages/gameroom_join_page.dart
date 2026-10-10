import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';

class GameRoomJoinPage extends StatefulWidget {
  const GameRoomJoinPage({super.key});

  @override
  State<GameRoomJoinPage> createState() => _GameRoomJoinPageState();
}

class _GameRoomJoinPageState extends State<GameRoomJoinPage> {
  final _codeController = TextEditingController();
  final _nicknameController = TextEditingController();
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void dispose() {
    _codeController.dispose();
    _nicknameController.dispose();
    super.dispose();
  }

  Future<void> _join() async {
    final code = _codeController.text.trim().toUpperCase();
    final nickname = _nicknameController.text.trim();
    if (code.isEmpty) {
      setState(() => _errorMessage = 'Xona kodini kiriting');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final dio = sl<Dio>();
      await dio.post(
        ApiPaths.gameRoomJoinPath(code),
        data: {'nickname': nickname.isNotEmpty ? nickname : 'O\'yinchi'},
      );

      if (!mounted) return;
      context.push(AppRoutes.gameRoom(code));
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? 'Xonaga ulanishda xatolik yuz berdi';
      setState(() => _errorMessage = msg.toString());
    } catch (e) {
      setState(() => _errorMessage = 'Xatolik: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Online O\'yin Xonasi'),
        centerTitle: true,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('🎮', style: TextStyle(fontSize: 64)),
              const SizedBox(height: 16),
              const Text(
                'Jonli Xonaga Qo\'shiling',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'Botda yoki adminda ko\'rsatilgan xona kodi orqali bellashuvga kiring.',
                style: TextStyle(color: Colors.white60, fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              if (_errorMessage != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.redAccent.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.redAccent.withOpacity(0.4)),
                  ),
                  child: Text(_errorMessage!, style: const TextStyle(color: Colors.redAccent)),
                ),
                const SizedBox(height: 16),
              ],
              TextField(
                controller: _codeController,
                textCapitalization: TextCapitalization.characters,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 22, letterSpacing: 4, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  labelText: 'XONA KODI (masalan: AB1234)',
                  floatingLabelAlignment: FloatingLabelAlignment.center,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _nicknameController,
                textAlign: TextAlign.center,
                decoration: InputDecoration(
                  labelText: 'Taxallus (Ixtiyoriy)',
                  floatingLabelAlignment: FloatingLabelAlignment.center,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
              const SizedBox(height: 28),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.gold,
                  foregroundColor: Colors.black,
                  minimumSize: const Size.fromHeight(52),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: _isLoading ? null : _join,
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.black)
                    : const Text(
                        'Xonaga Kirish',
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
