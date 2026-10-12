import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/theme/app_colors.dart';

class BattlePage extends StatefulWidget {
  const BattlePage({super.key, required this.battleId});

  final String battleId;

  @override
  State<BattlePage> createState() => _BattlePageState();
}

class _BattlePageState extends State<BattlePage> {
  Timer? _timer;
  Map<String, dynamic>? _battleState;
  bool _isLoading = true;
  String? _errorMessage;
  final _answerController = TextEditingController();
  bool _isSubmitting = false;

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
      final resp = await dio.get(ApiPaths.battleState(widget.battleId));
      if (!mounted) return;
      setState(() {
        _battleState = Map<String, dynamic>.from(resp.data['battle'] ?? resp.data);
        _isLoading = false;
      });
    } catch (e) {
      if (mounted && _isLoading) {
        setState(() {
          _errorMessage = 'Bellashuv ma\'lumotini yuklab bo\'lmadi: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _submitAnswer() async {
    final text = _answerController.text.trim();
    if (text.isEmpty) return;
    _answerController.clear();

    setState(() => _isSubmitting = true);
    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.battleAnswer(widget.battleId), data: {'answer': text});
      _fetch();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xatolik: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  Future<void> _forfeit() async {
    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.battleForfeit(widget.battleId));
      if (!mounted) return;
      Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xatolik: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('1v1 Bellashuv'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.flag_outlined, color: Colors.redAccent),
            tooltip: 'Taslim bo\'lish',
            onPressed: () => _confirmForfeit(),
          ),
        ],
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

    final myScore = _battleState?['my_score'] ?? 0;
    final oppScore = _battleState?['opponent_score'] ?? 0;
    final opponentName = _battleState?['opponent_name'] ?? 'Raqib';
    final roundNumber = _battleState?['current_round'] ?? 1;
    final question = _battleState?['current_question'] as Map?;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // 1v1 HISOB TIKLAMASI
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF831843), Color(0xFF500724)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.pinkAccent.withOpacity(0.3)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Column(
                  children: [
                    const Text('SIZ', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white70)),
                    const SizedBox(height: 6),
                    Text('$myScore', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: AppColors.gold)),
                  ],
                ),
                Text(
                  'Raund $roundNumber/10',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white60),
                ),
                Column(
                  children: [
                    Text(opponentName, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white70)),
                    const SizedBox(height: 6),
                    Text('$oppScore', style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white)),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          if (question != null) ...[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: Text(
                question['text'] ?? question['question'] ?? '',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, height: 1.4),
              ),
            ),
            const SizedBox(height: 16),
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
                  : const Text('Javobni tasdiqlash', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ] else ...[
            Container(
              padding: const EdgeInsets.all(32),
              alignment: Alignment.center,
              child: const Text('Raund kutilmoqda...'),
            ),
          ],
        ],
      ),
    );
  }

  void _confirmForfeit() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Taslim bo\'lish'),
        content: const Text('Haqiqatan ham ushbu bellashuvdan chiqmoqchimisiz? Natija mag\'lubiyat deb hisoblanadi.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Davom etish')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () {
              Navigator.pop(ctx);
              _forfeit();
            },
            child: const Text('Taslim bo\'lish'),
          ),
        ],
      ),
    );
  }
}
