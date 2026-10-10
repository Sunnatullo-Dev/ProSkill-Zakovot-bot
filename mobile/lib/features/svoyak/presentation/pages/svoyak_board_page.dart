import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/theme/app_colors.dart';

class SvoyakBoardPage extends StatefulWidget {
  const SvoyakBoardPage({super.key, required this.roomCode});

  final String roomCode;

  @override
  State<SvoyakBoardPage> createState() => _SvoyakBoardPageState();
}

class _SvoyakBoardPageState extends State<SvoyakBoardPage> {
  Timer? _timer;
  Map<String, dynamic>? _room;
  bool _isLoading = true;
  String? _errorMessage;
  final _answerController = TextEditingController();
  bool _isBuzzed = false;

  @override
  void initState() {
    super.initState();
    _fetch();
    _timer = Timer.periodic(const Duration(seconds: 2), (_) => _fetch());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _answerController.dispose();
    super.dispose();
  }

  Future<void> _fetch() async {
    try {
      final dio = sl<Dio>();
      final resp = await dio.get(ApiPaths.svoyakRoomState(widget.roomCode));
      if (!mounted) return;
      setState(() {
        _room = Map<String, dynamic>.from(resp.data['room'] ?? resp.data);
        _isLoading = false;
      });
    } catch (e) {
      if (mounted && _isLoading) {
        setState(() {
          _errorMessage = 'Svoyak xonasini yuklab bo\'lmadi: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _buzz() async {
    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.svoyakRoomBuzz(widget.roomCode));
      setState(() => _isBuzzed = true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('BUZZ bosilmadi: $e')));
      }
    }
  }

  Future<void> _submitAnswer() async {
    final text = _answerController.text.trim();
    if (text.isEmpty) return;
    _answerController.clear();

    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.svoyakRoomAnswer(widget.roomCode), data: {'answer': text});
      setState(() => _isBuzzed = false);
      _fetch();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Javob yuborilmadi: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Svoyak: ${widget.roomCode}'),
        centerTitle: true,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: AppColors.gold));
    }

    if (_errorMessage != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(_errorMessage!, textAlign: TextAlign.center),
        ),
      );
    }

    final question = _room?['current_question'] as Map?;
    final players = (_room?['players'] as List?) ?? [];
    final canBuzz = _room?['can_buzz'] == true;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Ballar doskasi (10..50)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF134E4A),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                const Text('BALLAR MATRITSASI', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.tealAccent)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [10, 20, 30, 40, 50].map((pts) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '$pts',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.gold),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Savol bloki
          if (question != null) ...[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Savol qiymati: ${question['points'] ?? 10} ball',
                    style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    question['text'] ?? question['question'] ?? '',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            // BUZZ TUGMASI
            if (!_isBuzzed)
              FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: canBuzz ? Colors.redAccent : Colors.grey,
                  minimumSize: const Size.fromHeight(60),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                icon: const Icon(Icons.touch_app_rounded, size: 28),
                label: const Text('BUZZ! (MEN JAVOB BERAMAN)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                onPressed: canBuzz ? _buzz : null,
              )
            else ...[
              TextField(
                controller: _answerController,
                autofocus: true,
                decoration: InputDecoration(
                  labelText: 'Javobingizni kiriting...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 10),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: AppColors.gold, foregroundColor: Colors.black),
                onPressed: _submitAnswer,
                child: const Text('Tasdiqlash'),
              ),
            ],
          ] else ...[
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              child: const Text('Savol tanlanishi kutilmoqda...'),
            ),
          ],
          const SizedBox(height: 24),

          // Ishtirokchilar
          const Text('O\'yinchilar ochkolari', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.gold)),
          const SizedBox(height: 8),
          ...players.map((p) {
            return ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const CircleAvatar(backgroundColor: Colors.teal, child: Icon(Icons.person, color: Colors.white)),
              title: Text(p['name'] ?? 'O\'yinchi'),
              trailing: Text('${p['score'] ?? 0} ball', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.gold)),
            );
          }),
        ],
      ),
    );
  }
}
