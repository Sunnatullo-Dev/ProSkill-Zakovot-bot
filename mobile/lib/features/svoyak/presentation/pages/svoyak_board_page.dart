import 'dart:async';
import 'dart:math';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/router/app_routes.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../svoyak_theme.dart';

class SvoyakBoardPage extends StatefulWidget {
  const SvoyakBoardPage({super.key, required this.roomCode});

  final String roomCode;

  @override
  State<SvoyakBoardPage> createState() => _SvoyakBoardPageState();
}

class _SvoyakBoardPageState extends State<SvoyakBoardPage> {
  Timer? _pollTimer;
  Timer? _countdownTimer;

  Map<String, dynamic>? _room;
  bool _isLoading = true;
  String? _errorMessage;

  // Auto Mode State
  int _lastQuestionIdx = -1;
  String _localPhase = 'reading'; // 'reading' or 'answering'
  int _readingSec = 10;
  int _answeringSec = 70;
  bool _buzzed = false;
  bool _isSubmitting = false;
  final _answerController = TextEditingController();

  // Classic Mode State
  bool _classicBuzzed = false;

  @override
  void initState() {
    super.initState();
    _fetch();
    _pollTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) => _fetch());
    _startCountdownTimer();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _countdownTimer?.cancel();
    _answerController.dispose();
    super.dispose();
  }

  int get _currentUserTelegramId {
    try {
      final user = sl<AuthBloc>().state.user;
      return user?.telegramId ?? 0;
    } catch (_) {
      return 0;
    }
  }

  void _startCountdownTimer() {
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      final auto = _room?['autoState'] as Map?;
      final isPlaying = auto?['isPlaying'] == true;
      if (!isPlaying) return;

      if (_localPhase == 'reading') {
        if (_readingSec > 0) {
          setState(() {
            _readingSec--;
            if (_readingSec == 0) {
              _localPhase = 'answering';
            }
          });
        } else {
          setState(() => _localPhase = 'answering');
        }
      } else if (_localPhase == 'answering') {
        if (_answeringSec > 0) {
          setState(() => _answeringSec--);
        }
      }
    });
  }

  Future<void> _fetch() async {
    try {
      final dio = sl<Dio>();
      final resp = await dio.get(ApiPaths.svoyakRoomState(widget.roomCode));
      if (!mounted) return;
      final raw = resp.data is Map ? resp.data as Map : {};
      final roomData = Map<String, dynamic>.from(raw['room'] is Map ? raw['room'] as Map : raw);

      setState(() {
        _room = roomData;
        _isLoading = false;
      });

      // Auto mode state sync
      final auto = roomData['autoState'] as Map?;
      if (auto != null) {
        final qIdx = (auto['questionIndex'] as int?) ?? 0;
        if (qIdx != _lastQuestionIdx) {
          _lastQuestionIdx = qIdx;
          _answerController.clear();
          _buzzed = false;
          _isSubmitting = false;

          final serverPhase = (auto['phase'] as String?) ?? 'reading';
          _localPhase = serverPhase;

          if (serverPhase == 'reading') {
            final ms = (auto['readingTimeRemainingMs'] as num?)?.toInt() ?? 10000;
            _readingSec = max(1, (ms / 1000).ceil());
            final ansMs = (auto['timeRemainingMs'] as num?)?.toInt() ?? 70000;
            _answeringSec = max(1, (ansMs / 1000).ceil());
          } else {
            _readingSec = 0;
            final ansMs = (auto['timeRemainingMs'] as num?)?.toInt() ?? 70000;
            _answeringSec = max(1, (ansMs / 1000).ceil());
          }
        }
      }
    } catch (e) {
      if (mounted && _isLoading) {
        setState(() {
          _errorMessage = 'Svoyak xonasini yuklab bo\'lmadi: $e';
          _isLoading = false;
        });
      }
    }
  }

  // ── Auto mode answer ──
  Future<void> _submitAutoAnswer() async {
    final text = _answerController.text.trim();
    if (text.isEmpty || _isSubmitting || _localPhase != 'answering') return;

    setState(() => _isSubmitting = true);
    HapticFeedback.lightImpact();

    try {
      final dio = sl<Dio>();
      await dio.post(
        ApiPaths.svoyakRoomAutoAnswer(widget.roomCode),
        data: {'answer': text},
      );
      _fetch();
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  // ── Classic mode buzz & answer ──
  Future<void> _buzzClassic() async {
    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.svoyakRoomBuzz(widget.roomCode));
      HapticFeedback.heavyImpact();
      setState(() => _classicBuzzed = true);
    } catch (_) {}
  }

  Future<void> _submitClassicAnswer() async {
    final text = _answerController.text.trim();
    if (text.isEmpty) return;
    _answerController.clear();

    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.svoyakRoomAnswer(widget.roomCode), data: {'answer': text});
      setState(() => _classicBuzzed = false);
      _fetch();
    } catch (_) {}
  }

  Future<void> _endGame() async {
    HapticFeedback.lightImpact();
    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.svoyakRoomEnd(widget.roomCode));
    } catch (_) {}
  }

  // ─── UI Build ──────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        backgroundColor: SvoyakTheme.bg,
        body: Container(
          decoration: SvoyakTheme.backgroundDecoration,
          child: const Center(child: CircularProgressIndicator(color: SvoyakTheme.gold)),
        ),
      );
    }

    if (_errorMessage != null || _room == null) {
      return Scaffold(
        backgroundColor: SvoyakTheme.bg,
        body: Container(
          decoration: SvoyakTheme.backgroundDecoration,
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('⚠️', style: TextStyle(fontSize: 40)),
                  const SizedBox(height: 12),
                  Text(
                    _errorMessage ?? 'Xonaga ulanib bo\'lmadi',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: SvoyakTheme.muted, fontSize: 14),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: SvoyakTheme.gold,
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Chiqish'),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    final status = (_room!['status'] as String?) ?? 'playing';
    final isAutoMode = _room!['isAutoMode'] != false;

    // Finished Screen
    if (status == 'finished') {
      return _buildFinishedScreen();
    }

    // Auto Mode Screen (Primary)
    if (isAutoMode) {
      return _buildAutoScreen();
    }

    // Classic Board Screen (Fallback)
    return _buildClassicScreen();
  }

  // ── FINISHED SCREEN ────────────────────────────────────────────────────────
  Widget _buildFinishedScreen() {
    final rawPlayers = (_room?['players'] as List?) ?? [];
    final players = List<Map<String, dynamic>>.from(
      rawPlayers.map((p) => Map<String, dynamic>.from(p as Map)),
    )..sort((a, b) => ((b['score'] as num?)?.toInt() ?? 0).compareTo((a['score'] as num?)?.toInt() ?? 0));

    final champion = players.isNotEmpty ? players.first : null;
    final champScore = (champion?['score'] as num?)?.toInt() ?? 0;

    return Scaffold(
      backgroundColor: SvoyakTheme.bg,
      body: Container(
        decoration: SvoyakTheme.backgroundDecoration,
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 430),
                child: Column(
                  children: [
                    const Text('🏆', style: TextStyle(fontSize: 60)),
                    const SizedBox(height: 8),
                    ShaderMask(
                      shaderCallback: (bounds) => const LinearGradient(
                        colors: [Colors.white, SvoyakTheme.gold, SvoyakTheme.orange],
                      ).createShader(bounds),
                      child: const Text(
                        'O\'yin yakunlandi',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Champion display
                    if (champion != null && champScore > 0) ...[
                      const Text(
                        'G\'OLIB',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: SvoyakTheme.muted,
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${champion['displayName'] ?? champion['name'] ?? ''} — $champScore ball',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: SvoyakTheme.gold,
                        ),
                      ),
                    ] else ...[
                      const Text(
                        'G\'olib aniqlanmadi',
                        style: TextStyle(color: SvoyakTheme.muted, fontSize: 14),
                      ),
                    ],
                    const SizedBox(height: 24),

                    // Ranked Leaderboard
                    Container(
                      decoration: SvoyakTheme.cardDecoration,
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        children: players.asMap().entries.map((entry) {
                          final idx = entry.key;
                          final p = entry.value;
                          final medal = idx == 0
                              ? '🥇'
                              : idx == 1
                                  ? '🥈'
                                  : idx == 2
                                      ? '🥉'
                                      : '#${idx + 1}';
                          final pName = (p['displayName'] ?? p['name'] ?? 'O\'yinchi').toString();
                          final pScore = (p['score'] as num?)?.toInt() ?? 0;

                          return Container(
                            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                            decoration: BoxDecoration(
                              border: idx < players.length - 1
                                  ? Border(
                                      bottom: BorderSide(
                                        color: Colors.white.withValues(alpha: 0.06),
                                      ),
                                    )
                                  : null,
                            ),
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 28,
                                  child: Text(medal, style: const TextStyle(fontSize: 16)),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    pName,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: SvoyakTheme.text,
                                    ),
                                  ),
                                ),
                                Text(
                                  pScore > 0 ? '+$pScore' : '$pScore',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                    color: pScore < 0 ? SvoyakTheme.neonRed : SvoyakTheme.gold,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Action buttons
                    InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          gradient: SvoyakTheme.goldGradient,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: SvoyakTheme.gold.withValues(alpha: 0.45),
                              blurRadius: 20,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'Yana o\'ynash',
                          style: TextStyle(
                            color: Color(0xFF0B0B14),
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => context.go(AppRoutes.home),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'Bosh sahifa',
                          style: TextStyle(
                            color: SvoyakTheme.text,
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── AUTO MODE SCREEN ───────────────────────────────────────────────────────
  Widget _buildAutoScreen() {
    final auto = _room?['autoState'] as Map?;
    final isPlaying = auto?['isPlaying'] == true;
    final questionText = (auto?['questionText'] as String?) ?? '';
    final totalQ = (auto?['totalQuestions'] as int?) ?? 5;
    final qIdx = ((auto?['questionIndex'] as int?) ?? 0) + 1;
    final points = qIdx * 10;

    final isHost = _room?['viewerIsHost'] == true;
    final status = (_room?['status'] as String?) ?? 'playing';
    final myAttempt = auto?['myAttempt'] as Map?;
    final attempts = (auto?['attempts'] as List?) ?? [];

    final rawPlayers = (_room?['players'] as List?) ?? [];
    final players = List<Map<String, dynamic>>.from(
      rawPlayers.map((p) => Map<String, dynamic>.from(p as Map)),
    )..sort((a, b) => ((b['score'] as num?)?.toInt() ?? 0).compareTo((a['score'] as num?)?.toInt() ?? 0));

    return Scaffold(
      backgroundColor: SvoyakTheme.bg,
      body: Container(
        decoration: SvoyakTheme.backgroundDecoration,
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 430),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Top Header Bar ──────────────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        '🎯 Svoyak',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: SvoyakTheme.text,
                        ),
                      ),
                      if (isPlaying) ...[
                        Row(
                          children: [
                            Text(
                              '$qIdx/$totalQ',
                              style: const TextStyle(fontSize: 13, color: SvoyakTheme.muted),
                            ),
                            const SizedBox(width: 8),
                            // Points badge
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: SvoyakTheme.gold.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: SvoyakTheme.gold.withValues(alpha: 0.4)),
                              ),
                              child: Text(
                                '+$points',
                                style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w900,
                                  color: SvoyakTheme.gold,
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            // Phase badge
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: _localPhase == 'reading'
                                    ? SvoyakTheme.blue.withValues(alpha: 0.15)
                                    : SvoyakTheme.gold.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: _localPhase == 'reading'
                                      ? SvoyakTheme.blue.withValues(alpha: 0.3)
                                      : SvoyakTheme.gold.withValues(alpha: 0.3),
                                ),
                              ),
                              child: Text(
                                _localPhase == 'reading' ? '📖 ${_readingSec}s' : '⏱ ${_answeringSec}s',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: _localPhase == 'reading' ? SvoyakTheme.blue : SvoyakTheme.gold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                      if (isHost)
                        InkWell(
                          borderRadius: BorderRadius.circular(8),
                          onTap: _endGame,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: SvoyakTheme.neonRed.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: SvoyakTheme.neonRed.withValues(alpha: 0.4)),
                            ),
                            child: const Text(
                              'Tugatish',
                              style: TextStyle(
                                color: SvoyakTheme.neonRed,
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // ── Leaderboard ─────────────────────────────────────────────
                  Container(
                    decoration: SvoyakTheme.cardDecoration,
                    clipBehavior: Clip.antiAlias,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                          decoration: const BoxDecoration(
                            border: Border(bottom: BorderSide(color: SvoyakTheme.border)),
                          ),
                          child: const Text(
                            'REYTING',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: SvoyakTheme.muted,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                        ConstrainedBox(
                          constraints: const BoxConstraints(maxHeight: 130),
                          child: ListView.builder(
                            shrinkWrap: true,
                            itemCount: players.length,
                            itemBuilder: (context, i) {
                              final p = players[i];
                              final pTid = p['telegramId'] as int? ?? 0;
                              final isMe = pTid == _currentUserTelegramId;
                              final medal = i == 0
                                  ? '🥇'
                                  : i == 1
                                      ? '🥈'
                                      : i == 2
                                          ? '🥉'
                                          : '#${i + 1}';
                              final pName = (p['displayName'] ?? p['name'] ?? 'O\'yinchi').toString();
                              final pScore = (p['score'] as num?)?.toInt() ?? 0;

                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                                color: isMe ? SvoyakTheme.gold.withValues(alpha: 0.1) : Colors.transparent,
                                child: Row(
                                  children: [
                                    SizedBox(
                                      width: 24,
                                      child: Text(medal, style: const TextStyle(fontSize: 13)),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        '$pName${isMe ? ' (men)' : ''}',
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: isMe ? FontWeight.w800 : FontWeight.w600,
                                          color: isMe ? SvoyakTheme.gold : SvoyakTheme.text,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      '$pScore',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w900,
                                        color: isMe ? SvoyakTheme.gold : SvoyakTheme.text,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── Question Card ───────────────────────────────────────────
                  if (isPlaying && questionText.isNotEmpty) ...[
                    Container(
                      decoration: BoxDecoration(
                        color: SvoyakTheme.surface,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: _localPhase == 'reading'
                              ? SvoyakTheme.blue.withValues(alpha: 0.4)
                              : SvoyakTheme.border,
                          width: 1.5,
                        ),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                      alignment: Alignment.center,
                      child: Text(
                        questionText,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: SvoyakTheme.text,
                          height: 1.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // ── Phase 1: Reading Phase ────────────────────────────────
                    if (_localPhase == 'reading') ...[
                      Column(
                        children: [
                          // Blue Ring Timer
                          SizedBox(
                            width: 76,
                            height: 76,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                CircularProgressIndicator(
                                  value: _readingSec / 10.0,
                                  strokeWidth: 5,
                                  backgroundColor: SvoyakTheme.border,
                                  valueColor: const AlwaysStoppedAnimation(SvoyakTheme.blue),
                                ),
                                Text(
                                  '$_readingSec',
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w900,
                                    color: SvoyakTheme.blue,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 14),
                          const Text(
                            '📖 Savolni o\'qing',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: SvoyakTheme.blue,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Javob yozish ${_readingSec}s dan keyin ochiladi',
                            style: const TextStyle(fontSize: 12, color: SvoyakTheme.muted),
                          ),
                          const SizedBox(height: 18),
                          // Locked Box
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.03),
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                color: SvoyakTheme.blue.withValues(alpha: 0.2),
                                style: BorderStyle.solid,
                              ),
                            ),
                            alignment: Alignment.center,
                            child: const Text(
                              '🔒 Javob yozish bloklangan',
                              style: TextStyle(
                                color: Color(0x808892A4),
                                fontSize: 14,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ] else ...[
                      // ── Phase 2: Answering Phase ─────────────────────────────
                      Column(
                        children: [
                          // Gold/Warning/Red Ring Timer
                          SizedBox(
                            width: 68,
                            height: 68,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                CircularProgressIndicator(
                                  value: _answeringSec / 70.0,
                                  strokeWidth: 5,
                                  backgroundColor: SvoyakTheme.border,
                                  valueColor: AlwaysStoppedAnimation(
                                    _answeringSec > 40
                                        ? SvoyakTheme.gold
                                        : _answeringSec > 15
                                            ? const Color(0xFFF59E0B)
                                            : SvoyakTheme.neonRed,
                                  ),
                                ),
                                Text(
                                  '$_answeringSec',
                                  style: TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: _answeringSec > 40
                                        ? SvoyakTheme.gold
                                        : _answeringSec > 15
                                            ? const Color(0xFFF59E0B)
                                            : SvoyakTheme.neonRed,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 18),

                          // My Attempt Result
                          if (myAttempt != null) ...[
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(18),
                              decoration: BoxDecoration(
                                color: myAttempt['isCorrect'] == true
                                    ? SvoyakTheme.neonGreen.withValues(alpha: 0.15)
                                    : SvoyakTheme.neonRed.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(
                                  color: myAttempt['isCorrect'] == true
                                      ? SvoyakTheme.neonGreen.withValues(alpha: 0.4)
                                      : SvoyakTheme.neonRed.withValues(alpha: 0.3),
                                ),
                              ),
                              child: Column(
                                children: [
                                  Text(
                                    myAttempt['isCorrect'] == true ? '✅' : '❌',
                                    style: const TextStyle(fontSize: 26),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    myAttempt['isCorrect'] == true
                                        ? 'To\'g\'ri! +$points ball'
                                        : 'Noto\'g\'ri',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                      color: myAttempt['isCorrect'] == true
                                          ? SvoyakTheme.neonGreen
                                          : SvoyakTheme.neonRed,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'Boshqalarni kuting...',
                                    style: TextStyle(fontSize: 12, color: SvoyakTheme.muted),
                                  ),
                                ],
                              ),
                            ),
                          ] else if (!_buzzed) ...[
                            // ── Buzz Gate ("+" Button) ────────────────────────
                            Column(
                              children: [
                                InkWell(
                                  borderRadius: BorderRadius.circular(999),
                                  onTap: _answeringSec > 0
                                      ? () {
                                          HapticFeedback.heavyImpact();
                                          setState(() => _buzzed = true);
                                        }
                                      : null,
                                  child: Container(
                                    width: 96,
                                    height: 96,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      gradient: _answeringSec > 0
                                          ? SvoyakTheme.goldGradient
                                          : null,
                                      color: _answeringSec > 0 ? null : Colors.grey.withValues(alpha: 0.3),
                                      border: Border.all(
                                        color: SvoyakTheme.gold,
                                        width: 3,
                                      ),
                                      boxShadow: _answeringSec > 0
                                          ? [
                                              BoxShadow(
                                                color: SvoyakTheme.gold.withValues(alpha: 0.5),
                                                blurRadius: 28,
                                                spreadRadius: 2,
                                              ),
                                            ]
                                          : null,
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      '+',
                                      style: TextStyle(
                                        fontSize: 48,
                                        fontWeight: FontWeight.w900,
                                        color: _answeringSec > 0
                                            ? const Color(0xFF0B0B14)
                                            : SvoyakTheme.muted,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                const Text(
                                  'Javob beraman',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                    color: SvoyakTheme.gold,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                const Text(
                                  'Javob yozish uchun "+" tugmasini bosing',
                                  style: TextStyle(fontSize: 12, color: SvoyakTheme.muted),
                                ),
                              ],
                            ),
                          ] else ...[
                            // ── Answer Input ──────────────────────────────────
                            TextField(
                              controller: _answerController,
                              autofocus: true,
                              style: const TextStyle(fontSize: 16, color: Colors.white),
                              decoration: InputDecoration(
                                hintText: 'Javobingizni yozing...',
                                hintStyle: const TextStyle(color: SvoyakTheme.muted),
                                filled: true,
                                fillColor: SvoyakTheme.surface,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(color: SvoyakTheme.border),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(14),
                                  borderSide: const BorderSide(color: SvoyakTheme.gold, width: 2),
                                ),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                              ),
                              onSubmitted: (_) => _submitAutoAnswer(),
                            ),
                            const SizedBox(height: 10),
                            InkWell(
                              borderRadius: BorderRadius.circular(14),
                              onTap: _isSubmitting || _answeringSec == 0 ? null : _submitAutoAnswer,
                              child: Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                decoration: BoxDecoration(
                                  gradient: SvoyakTheme.goldGradient,
                                  borderRadius: BorderRadius.circular(14),
                                  boxShadow: [
                                    BoxShadow(
                                      color: SvoyakTheme.gold.withValues(alpha: 0.4),
                                      blurRadius: 16,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  _isSubmitting ? 'Yuborilmoqda...' : 'Javob berish ✓',
                                  style: const TextStyle(
                                    color: Color(0xFF0B0B14),
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                            ),
                          ],

                          // ── Other Players Attempts ──────────────────────────
                          if (attempts.isNotEmpty) ...[
                            const SizedBox(height: 18),
                            Align(
                              alignment: Alignment.centerLeft,
                              child: Text(
                                'O\'YINCHILAR',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: SvoyakTheme.muted.withValues(alpha: 0.8),
                                  letterSpacing: 1.2,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            ...attempts.map((a) {
                              final isRevealed = a['answer'] != null && a['isCorrect'] != null;
                              final isCorr = a['isCorrect'] == true;
                              final aName = (a['displayName'] ?? 'O\'yinchi').toString();
                              final aAns = (a['answer'] ?? 'javob berdi').toString();

                              return Container(
                                margin: const EdgeInsets.only(bottom: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: SvoyakTheme.surface,
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: SvoyakTheme.border),
                                ),
                                child: Row(
                                  children: [
                                    Text(
                                      isRevealed ? (isCorr ? '✓' : '✗') : '✓',
                                      style: TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.w900,
                                        color: isRevealed
                                            ? (isCorr ? SvoyakTheme.neonGreen : SvoyakTheme.neonRed)
                                            : SvoyakTheme.gold,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        aName,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: SvoyakTheme.text,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      isRevealed ? aAns : 'javob berdi',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: SvoyakTheme.muted,
                                      ),
                                    ),
                                  ],
                                ),
                              );
                            }),
                          ],
                        ],
                      ),
                    ],
                  ] else if (auto != null && !isPlaying && status == 'playing') ...[
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 40),
                      child: Column(
                        children: [
                          Text('⏳', style: TextStyle(fontSize: 32)),
                          SizedBox(height: 10),
                          Text(
                            'Keyingi savol tayyorlanmoqda...',
                            style: TextStyle(fontWeight: FontWeight.w700, color: SvoyakTheme.muted),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── CLASSIC SCREEN (FALLBACK) ──────────────────────────────────────────────
  Widget _buildClassicScreen() {
    final question = _room?['current_question'] as Map?;
    final players = (_room?['players'] as List?) ?? [];
    final canBuzz = _room?['can_buzz'] == true;

    return Scaffold(
      backgroundColor: SvoyakTheme.bg,
      appBar: AppBar(
        backgroundColor: SvoyakTheme.surface,
        title: Text('Svoyak: ${widget.roomCode}', style: const TextStyle(fontWeight: FontWeight.w800)),
        centerTitle: true,
      ),
      body: Container(
        decoration: SvoyakTheme.backgroundDecoration,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // 10..50 points row
              Container(
                padding: const EdgeInsets.all(16),
                decoration: SvoyakTheme.cardDecoration,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [10, 20, 30, 40, 50].map((pts) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '$pts',
                        style: const TextStyle(fontWeight: FontWeight.bold, color: SvoyakTheme.gold),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 16),

              if (question != null) ...[
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: SvoyakTheme.cardDecoration,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Savol: ${question['points'] ?? 10} ball',
                        style: const TextStyle(color: SvoyakTheme.gold, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        question['text'] ?? question['question'] ?? '',
                        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600, height: 1.4),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                if (!_classicBuzzed)
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: canBuzz ? SvoyakTheme.neonRed : Colors.grey,
                      minimumSize: const Size.fromHeight(56),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    icon: const Icon(Icons.touch_app_rounded, size: 24),
                    label: const Text('BUZZ! (MEN JAVOB BERAMAN)', style: TextStyle(fontWeight: FontWeight.bold)),
                    onPressed: canBuzz ? _buzzClassic : null,
                  )
                else ...[
                  TextField(
                    controller: _answerController,
                    autofocus: true,
                    decoration: InputDecoration(
                      hintText: 'Javobingizni kiriting...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                  const SizedBox(height: 10),
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: SvoyakTheme.gold, foregroundColor: Colors.black),
                    onPressed: _submitClassicAnswer,
                    child: const Text('Tasdiqlash'),
                  ),
                ],
              ],
              const SizedBox(height: 24),

              // Players
              const Text('Ishtirokchilar', style: TextStyle(fontWeight: FontWeight.bold, color: SvoyakTheme.gold)),
              const SizedBox(height: 8),
              ...players.map((p) {
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const CircleAvatar(backgroundColor: SvoyakTheme.surface, child: Text('👤')),
                  title: Text(p['name'] ?? p['displayName'] ?? 'O\'yinchi'),
                  trailing: Text('${p['score'] ?? 0} ball', style: const TextStyle(fontWeight: FontWeight.bold, color: SvoyakTheme.gold)),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}
