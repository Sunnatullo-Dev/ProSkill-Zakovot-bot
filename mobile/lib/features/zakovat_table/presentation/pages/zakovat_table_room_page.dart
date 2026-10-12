import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/theme/app_colors.dart';

class ZakovatTableRoomPage extends StatefulWidget {
  const ZakovatTableRoomPage({super.key, required this.roomCode});

  final String roomCode;

  @override
  State<ZakovatTableRoomPage> createState() => _ZakovatTableRoomPageState();
}

class _ZakovatTableRoomPageState extends State<ZakovatTableRoomPage> {
  Timer? _timer;
  Map<String, dynamic>? _room;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetch();
    _timer = Timer.periodic(const Duration(seconds: 2), (_) => _fetch());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _fetch() async {
    try {
      final dio = sl<Dio>();
      final resp = await dio.get(ApiPaths.zakovatTableState(widget.roomCode));
      if (!mounted) return;
      setState(() {
        _room = Map<String, dynamic>.from(resp.data['room'] ?? resp.data);
        _isLoading = false;
      });
    } catch (e) {
      if (mounted && _isLoading) {
        setState(() {
          _errorMessage = 'Stol ma\'lumotini yuklab bo\'lmadi: $e';
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Zakovat Stoli #${widget.roomCode}'),
        centerTitle: true,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Colors.redAccent));
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(_errorMessage!, textAlign: TextAlign.center),
        ),
      );
    }

    final teamScore = _room?['team_score'] ?? 0;
    final viewerScore = _room?['viewer_score'] ?? 0;
    final currentSector = _room?['current_sector'] ?? 1;
    final question = _room?['current_question'] as Map?;
    final phase = _room?['phase'] ?? 'idle';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Hisob taxtasi
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF7F1D1D), Color(0xFF450A0A)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.redAccent.withOpacity(0.5)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    const Text('BILIMDONLAR', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    Text('$teamScore', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w900, color: AppColors.gold)),
                  ],
                ),
                const Text(':', style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.white38)),
                Column(
                  children: [
                    const Text('TOMOSHABINLAR', style: TextStyle(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 6),
                    Text('$viewerScore', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w900, color: Colors.white)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Sektorlar doirasi (1-12)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                const Text('12 TA SEKTOR', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.gold)),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: List.generate(12, (index) {
                    final num = index + 1;
                    final isActive = num == currentSector;
                    return Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isActive ? Colors.redAccent : Colors.white.withOpacity(0.08),
                        border: Border.all(color: isActive ? AppColors.gold : Colors.white12, width: 2),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '$num',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: isActive ? Colors.white : Colors.white70,
                        ),
                      ),
                    );
                  }),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Savol qismi
          if (question != null)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Sektor: $currentSector', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.gold)),
                      Text('Faza: $phase', style: const TextStyle(color: Colors.white60, fontSize: 13)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    question['text'] ?? question['question'] ?? '',
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, height: 1.4),
                  ),
                ],
              ),
            )
          else
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              child: const Column(
                children: [
                  Icon(Icons.rotate_right_rounded, size: 48, color: Colors.redAccent),
                  SizedBox(height: 12),
                  Text('Navbatdagi sektor tanlanmoqda...'),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
