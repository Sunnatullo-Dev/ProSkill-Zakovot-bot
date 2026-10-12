import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/theme/app_colors.dart';

class GameRoomPlayPage extends StatefulWidget {
  const GameRoomPlayPage({super.key, required this.roomCode});

  final String roomCode;

  @override
  State<GameRoomPlayPage> createState() => _GameRoomPlayPageState();
}

class _GameRoomPlayPageState extends State<GameRoomPlayPage> {
  Timer? _pollingTimer;
  Map<String, dynamic>? _roomState;
  bool _isLoading = true;
  String? _errorMessage;
  final _answerController = TextEditingController();
  bool _isSubmitting = false;
  bool _hasAnswered = false;

  @override
  void initState() {
    super.initState();
    _fetchState();
    _pollingTimer = Timer.periodic(const Duration(seconds: 2), (_) => _fetchState());
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _answerController.dispose();
    super.dispose();
  }

  Future<void> _fetchState() async {
    try {
      final dio = sl<Dio>();
      final resp = await dio.get(ApiPaths.gameRoomState(widget.roomCode));
      if (!mounted) return;
      final roomData = resp.data['room'] ?? resp.data;
      setState(() {
        _roomState = Map<String, dynamic>.from(roomData as Map);
        _isLoading = false;
      });
    } catch (e) {
      if (mounted && _isLoading) {
        setState(() {
          _errorMessage = 'Xona ma\'lumotini yuklab bo\'lmadi: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _submitAnswer() async {
    final text = _answerController.text.trim();
    if (text.isEmpty) return;

    setState(() => _isSubmitting = true);
    try {
      final dio = sl<Dio>();
      await dio.post(
        ApiPaths.gameRoomAnswer(widget.roomCode),
        data: {'answer': text},
      );
      if (!mounted) return;
      setState(() {
        _hasAnswered = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Javob qabul qilindi!'), backgroundColor: Colors.green),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xatolik: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Xona: ${widget.roomCode}'),
        centerTitle: true,
      ),
      body: _buildContent(),
    );
  }

  Widget _buildContent() {
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

    final question = _roomState?['current_question'] as Map?;
    final participants = (_roomState?['participants'] as List?) ?? [];
    final status = _roomState?['status'] ?? 'waiting';

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Xona status kartasi
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.gold.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.circle, color: Colors.greenAccent, size: 12),
                    const SizedBox(width: 8),
                    Text(
                      'Holat: $status'.toUpperCase(),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white70),
                    ),
                  ],
                ),
                Text(
                  '${participants.length} ishtirokchi',
                  style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Savol mavjud bo'lsa
          if (question != null) ...[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF312E81), Color(0xFF1E1B4B)],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'SAVOL',
                        style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '${question['points'] ?? 1} ball',
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    question['text'] ?? question['question'] ?? '',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (!_hasAnswered) ...[
              TextField(
                controller: _answerController,
                decoration: InputDecoration(
                  hintText: 'Javobingizni yozing...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.gold,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                onPressed: _isSubmitting ? null : _submitAnswer,
                child: _isSubmitting
                    ? const CircularProgressIndicator(color: Colors.black)
                    : const Text('Javobni yuborish', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.green.withOpacity(0.3)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle_outline, color: Colors.green),
                    SizedBox(width: 8),
                    Text('Javobingiz yuborildi. Raund yakunini kuting!', style: TextStyle(color: Colors.green)),
                  ],
                ),
              ),
            ],
          ] else ...[
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              child: const Column(
                children: [
                  Icon(Icons.hourglass_top_rounded, size: 48, color: AppColors.gold),
                  SizedBox(height: 12),
                  Text(
                    'Navbatdagi savol kutilmoqda...',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 24),
          const Text(
            'Ishtirokchilar reytingi',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.gold),
          ),
          const SizedBox(height: 8),
          ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: participants.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final p = participants[index];
              final name = p['nickname'] ?? p['name'] ?? 'O\'yinchi';
              final score = p['score'] ?? 0;
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    Text('#${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(width: 12),
                    Expanded(child: Text(name)),
                    Text('$score ball', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.gold)),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
