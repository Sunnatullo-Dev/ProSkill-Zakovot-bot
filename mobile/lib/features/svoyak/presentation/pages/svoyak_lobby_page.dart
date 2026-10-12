import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/router/app_routes.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';
import '../svoyak_theme.dart';

enum _LobbyMode { menu, hostSetup, joining, inLobby }

class SvoyakLobbyPage extends StatefulWidget {
  const SvoyakLobbyPage({super.key, this.initialJoinCode});

  final String? initialJoinCode;

  @override
  State<SvoyakLobbyPage> createState() => _SvoyakLobbyPageState();
}

class _SvoyakLobbyPageState extends State<SvoyakLobbyPage> {
  late _LobbyMode _mode;
  String? _activeCode;
  String? _errorMessage;
  bool _isBusy = false;

  // Categories for Host Setup
  List<Map<String, dynamic>> _categories = [];
  bool _catsLoading = false;
  int? _selectedTopicId; // null = Aralash (barcha mavzular)

  // Join mode
  final _joinCodeController = TextEditingController();
  String _joinRole = 'player'; // 'player' or 'coordinator'

  // In-lobby polling
  Timer? _pollTimer;
  Map<String, dynamic>? _roomState;
  bool _gameStartedHandled = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialJoinCode != null && widget.initialJoinCode!.isNotEmpty) {
      _mode = _LobbyMode.joining;
      _joinCodeController.text = widget.initialJoinCode!.toUpperCase();
    } else {
      _mode = _LobbyMode.menu;
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _joinCodeController.dispose();
    super.dispose();
  }

  String get _currentUserName {
    try {
      final user = sl<AuthBloc>().state.user;
      return user?.visibleName ?? 'O\'yinchi';
    } catch (_) {
      return 'O\'yinchi';
    }
  }

  int get _currentUserTelegramId {
    try {
      final user = sl<AuthBloc>().state.user;
      return user?.telegramId ?? 0;
    } catch (_) {
      return 0;
    }
  }

  // ─── Categories ────────────────────────────────────────────────────────────

  Future<void> _loadCategories() async {
    setState(() {
      _catsLoading = true;
      _errorMessage = null;
    });

    try {
      final dio = sl<Dio>();
      final resp = await dio.get(ApiPaths.svoyakCategories);
      final raw = resp.data;
      final List list;
      if (raw is Map) {
        list = raw['items'] as List? ?? raw['categories'] as List? ?? [];
      } else if (raw is List) {
        list = raw;
      } else {
        list = [];
      }
      if (mounted) {
        setState(() {
          _categories = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = 'Mavzularni yuklab bo\'lmadi: $e');
      }
    } finally {
      if (mounted) setState(() => _catsLoading = false);
    }
  }

  // ─── Room Actions ──────────────────────────────────────────────────────────

  Future<void> _createRoom() async {
    setState(() {
      _isBusy = true;
      _errorMessage = null;
    });

    try {
      final dio = sl<Dio>();
      final payload = <String, dynamic>{
        'displayName': _currentUserName,
        if (_selectedTopicId != null) 'categoryId': _selectedTopicId,
      };

      final resp = await dio.post(ApiPaths.svoyakRooms, data: payload);
      final data = resp.data is Map ? resp.data as Map : {};
      final roomData = (data['room'] is Map ? data['room'] as Map : data);
      final code = (roomData['code'] ?? data['code'])?.toString();

      if (code != null && code.isNotEmpty) {
        if (!mounted) return;
        setState(() {
          _activeCode = code;
          _roomState = Map<String, dynamic>.from(roomData);
          _mode = _LobbyMode.inLobby;
          _gameStartedHandled = false;
        });
        _startPolling(code);
      } else {
        throw 'Xona kodi olinmadi';
      }
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = 'Xona yaratib bo\'lmadi: $e');
      }
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  Future<void> _joinRoom(String code) async {
    final normalized = code.trim().toUpperCase();
    if (normalized.length < 4) {
      setState(() => _errorMessage = 'Kod kamida 4 ta belgi');
      return;
    }

    setState(() {
      _isBusy = true;
      _errorMessage = null;
    });

    try {
      final dio = sl<Dio>();
      final resp = await dio.post(
        ApiPaths.svoyakRoomJoin(normalized),
        data: {
          'displayName': _currentUserName,
          'role': _joinRole,
        },
      );

      final data = resp.data is Map ? resp.data as Map : {};
      final roomData = (data['room'] is Map ? data['room'] as Map : data);
      final roomCode = (roomData['code'] ?? data['code'] ?? normalized).toString();

      if (!mounted) return;
      setState(() {
        _activeCode = roomCode;
        _roomState = Map<String, dynamic>.from(roomData);
        _mode = _LobbyMode.inLobby;
        _gameStartedHandled = false;
      });
      _startPolling(roomCode);
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = 'Xonaga qo\'shilib bo\'lmadi: $e');
      }
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  void _startPolling(String code) {
    _pollTimer?.cancel();
    _fetchRoomState(code);
    _pollTimer = Timer.periodic(const Duration(milliseconds: 1500), (_) {
      _fetchRoomState(code);
    });
  }

  Future<void> _fetchRoomState(String code) async {
    try {
      final dio = sl<Dio>();
      final resp = await dio.get(ApiPaths.svoyakRoomState(code));
      if (!mounted) return;
      final data = resp.data is Map ? resp.data as Map : {};
      final state = Map<String, dynamic>.from(data['room'] is Map ? data['room'] as Map : data);

      setState(() {
        _roomState = state;
      });

      // Status 'playing' bo'lsa o'yin sahifasiga o'tish
      if (state['status'] == 'playing' && !_gameStartedHandled) {
        _gameStartedHandled = true;
        _pollTimer?.cancel();
        context.push(AppRoutes.svoyakRoom(code)).then((_) {
          // O'yindan qaytganida holatni tozalash
          if (mounted) {
            setState(() {
              _mode = _LobbyMode.menu;
              _activeCode = null;
              _roomState = null;
            });
          }
        });
      }
    } catch (_) {
      // Polling xatolarini jimgina ushlaymiz
    }
  }

  Future<void> _startGame() async {
    if (_activeCode == null) return;
    setState(() {
      _isBusy = true;
      _errorMessage = null;
    });

    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.svoyakRoomStart(_activeCode!));
      _gameStartedHandled = true;
      _pollTimer?.cancel();
      if (!mounted) return;
      context.push(AppRoutes.svoyakRoom(_activeCode!)).then((_) {
        if (mounted) {
          setState(() {
            _mode = _LobbyMode.menu;
            _activeCode = null;
            _roomState = null;
          });
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() => _errorMessage = 'O\'yinni boshlab bo\'lmadi: $e');
      }
    } finally {
      if (mounted) setState(() => _isBusy = false);
    }
  }

  Future<void> _leaveRoom() async {
    if (_activeCode == null) return;
    _pollTimer?.cancel();
    setState(() => _isBusy = true);
    try {
      final dio = sl<Dio>();
      await dio.delete(ApiPaths.svoyakRoomLeave(_activeCode!));
    } catch (_) {}
    if (mounted) {
      setState(() {
        _activeCode = null;
        _roomState = null;
        _mode = _LobbyMode.menu;
        _isBusy = false;
        _errorMessage = null;
      });
    }
  }

  Future<void> _closeRoom() async {
    if (_activeCode == null) return;
    _pollTimer?.cancel();
    setState(() => _isBusy = true);
    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.svoyakRoomEnd(_activeCode!));
    } catch (_) {}
    if (mounted) {
      setState(() {
        _activeCode = null;
        _roomState = null;
        _mode = _LobbyMode.menu;
        _isBusy = false;
        _errorMessage = null;
      });
    }
  }

  void _shareCode() {
    if (_activeCode == null) return;
    HapticFeedback.lightImpact();
    final text = '🎲 Svoyak\'ga qo\'shiling — kod: $_activeCode\nhttps://t.me/ZakovatApp_bot?startapp=svoyak_$_activeCode';
    SharePlus.instance.share(ShareParams(text: text));
  }

  void _copyCode() {
    if (_activeCode == null) return;
    HapticFeedback.lightImpact();
    Clipboard.setData(ClipboardData(text: _activeCode!));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Xona kodi nusxalandi: $_activeCode'),
        backgroundColor: SvoyakTheme.surface,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // ─── UI Build ──────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SvoyakTheme.bg,
      body: Container(
        decoration: SvoyakTheme.backgroundDecoration,
        child: SafeArea(
          child: switch (_mode) {
            _LobbyMode.menu => _buildMenu(),
            _LobbyMode.hostSetup => _buildHostSetup(),
            _LobbyMode.joining => _buildJoining(),
            _LobbyMode.inLobby => _buildInLobby(),
          },
        ),
      ),
    );
  }

  // ── 1. MENU ────────────────────────────────────────────────────────────────
  Widget _buildMenu() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 430),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Title with Gradient
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: [Colors.white, SvoyakTheme.gold, SvoyakTheme.orange],
                ).createShader(bounds),
                child: const Text(
                  'Svoyak o\'yini',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Mavzular bo\'yicha tezkor savol-javob intellektual bellashuvi',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: SvoyakTheme.muted, height: 1.5),
              ),
              const SizedBox(height: 32),

              // Card
              Container(
                decoration: SvoyakTheme.cardDecoration,
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    // Create Room Button
                    InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: _isBusy
                          ? null
                          : () {
                              HapticFeedback.selectionClick();
                              setState(() {
                                _mode = _LobbyMode.hostSetup;
                                _errorMessage = null;
                              });
                              if (_categories.isEmpty) _loadCategories();
                            },
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          gradient: SvoyakTheme.goldGradient,
                          borderRadius: BorderRadius.circular(14),
                          boxShadow: [
                            BoxShadow(
                              color: SvoyakTheme.gold.withValues(alpha: 0.4),
                              blurRadius: 18,
                              offset: const Offset(0, 6),
                            ),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'Xona yaratish',
                          style: TextStyle(
                            color: Color(0xFF0B0B14),
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Join with Code Button
                    InkWell(
                      borderRadius: BorderRadius.circular(14),
                      onTap: _isBusy
                          ? null
                          : () {
                              HapticFeedback.selectionClick();
                              setState(() {
                                _mode = _LobbyMode.joining;
                                _errorMessage = null;
                              });
                            },
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
                          'Kod bilan kirish',
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

              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ── 2. HOST SETUP ──────────────────────────────────────────────────────────
  Widget _buildHostSetup() {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 430),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Row(
              children: [
                const Text('🎯', style: TextStyle(fontSize: 26)),
                const SizedBox(width: 10),
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [SvoyakTheme.gold, Color(0xFFFFD580), SvoyakTheme.orange],
                  ).createShader(bounds),
                  child: const Text(
                    'Yangi o\'yin',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            const Text(
              'Mavzu tanlang yoki aralash rejimda o\'ynang',
              style: TextStyle(fontSize: 13, color: SvoyakTheme.muted),
            ),
            const SizedBox(height: 16),

            // Section Label
            const Text(
              'MAVZU TANLANG',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: SvoyakTheme.gold,
                letterSpacing: 2.2,
              ),
            ),
            const SizedBox(height: 8),

            // Topics List
            Container(
              decoration: BoxDecoration(
                color: const Color(0xBF0A1428),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: SvoyakTheme.gold.withValues(alpha: 0.2)),
              ),
              padding: const EdgeInsets.all(8),
              constraints: const BoxConstraints(maxHeight: 380),
              child: _catsLoading
                  ? const Center(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: CircularProgressIndicator(color: SvoyakTheme.gold),
                      ),
                    )
                  : ListView(
                      shrinkWrap: true,
                      children: [
                        // Aralash (default)
                        _buildTopicItem(
                          id: null,
                          emoji: '🎲',
                          name: 'Aralash',
                          subtitle: 'Barcha mavzulardan',
                          isSelected: _selectedTopicId == null,
                          isReady: true,
                          onTap: () {
                            HapticFeedback.selectionClick();
                            setState(() => _selectedTopicId = null);
                          },
                        ),
                        Divider(color: SvoyakTheme.gold.withValues(alpha: 0.15), height: 16),
                        ..._categories.map((c) {
                          final id = c['id'] as int? ?? 0;
                          final name = (c['name'] ?? 'Mavzu').toString();
                          final emoji = (c['iconEmoji'] ?? '📚').toString();
                          final count = c['questionCount'] as int? ?? 0;
                          final isReady = (c['ready'] as bool? ?? false) || count >= 5;
                          final isSel = _selectedTopicId == id;

                          return _buildTopicItem(
                            id: id,
                            emoji: emoji,
                            name: name,
                            subtitle: isReady ? '$count ta savol' : 'Yetarli savol yo\'q',
                            isSelected: isSel,
                            isReady: isReady,
                            onTap: isReady
                                ? () {
                                    HapticFeedback.selectionClick();
                                    setState(() => _selectedTopicId = id);
                                  }
                                : null,
                          );
                        }),
                      ],
                    ),
            ),
            const SizedBox(height: 10),

            // Helper line
            Text(
              _selectedTopicId == null
                  ? 'Barcha mavzulardan aralash — solo: 3 ta, jamoa: 7 ta savol'
                  : 'Tanlangan mavzudan savollar tartib bilan beriladi (10 dan 50 ballgacha)',
              style: const TextStyle(fontSize: 12, color: SvoyakTheme.muted, height: 1.5),
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: 10),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12),
              ),
            ],
            const SizedBox(height: 16),

            // Action Buttons
            InkWell(
              borderRadius: BorderRadius.circular(14),
              onTap: _isBusy ? null : _createRoom,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  gradient: SvoyakTheme.goldGradient,
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: SvoyakTheme.gold.withValues(alpha: 0.4),
                      blurRadius: 18,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                alignment: Alignment.center,
                child: Text(
                  _isBusy ? 'Yaratilmoqda...' : 'Xona yaratish →',
                  style: const TextStyle(
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
              onTap: _isBusy ? null : () => setState(() => _mode = _LobbyMode.menu),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.04),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                ),
                alignment: Alignment.center,
                child: const Text(
                  '← Orqaga',
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
    );
  }

  Widget _buildTopicItem({
    required int? id,
    required String emoji,
    required String name,
    required String subtitle,
    required bool isSelected,
    required bool isReady,
    required VoidCallback? onTap,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: isSelected
                ? SvoyakTheme.gold.withValues(alpha: 0.12)
                : isReady
                    ? SvoyakTheme.surface
                    : Colors.black.withValues(alpha: 0.2),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? SvoyakTheme.gold
                  : isReady
                      ? SvoyakTheme.border
                      : Colors.white.withValues(alpha: 0.05),
              width: 1.5,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: isSelected
                      ? SvoyakTheme.gold.withValues(alpha: 0.22)
                      : isReady
                          ? SvoyakTheme.gold.withValues(alpha: 0.1)
                          : Colors.white.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(10),
                ),
                alignment: Alignment.center,
                child: Text(emoji, style: const TextStyle(fontSize: 18)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isSelected
                            ? SvoyakTheme.gold
                            : isReady
                                ? SvoyakTheme.text
                                : SvoyakTheme.muted,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 11,
                        color: SvoyakTheme.muted,
                      ),
                    ),
                  ],
                ),
              ),
              if (isSelected)
                const Text(
                  '✓',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: SvoyakTheme.gold,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  // ── 3. JOINING ─────────────────────────────────────────────────────────────
  Widget _buildJoining() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 430),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Xonaga qo\'shilish',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Do\'stingiz yuborgan xona kodini kiriting',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: SvoyakTheme.muted),
              ),
              const SizedBox(height: 24),

              Container(
                decoration: SvoyakTheme.cardDecoration,
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    // Room code field
                    TextField(
                      controller: _joinCodeController,
                      textCapitalization: TextCapitalization.characters,
                      textAlign: TextAlign.center,
                      maxLength: 8,
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 8,
                        color: SvoyakTheme.gold,
                      ),
                      decoration: InputDecoration(
                        counterText: '',
                        hintText: 'ABCD12',
                        hintStyle: TextStyle(
                          color: Colors.white.withValues(alpha: 0.2),
                          letterSpacing: 4,
                        ),
                        filled: true,
                        fillColor: Colors.black.withValues(alpha: 0.35),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: SvoyakTheme.border),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: SvoyakTheme.gold, width: 2),
                        ),
                        contentPadding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Role Picker
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(10),
                            onTap: () => setState(() => _joinRole = 'player'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: _joinRole == 'player'
                                    ? SvoyakTheme.gold.withValues(alpha: 0.15)
                                    : SvoyakTheme.surface,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: _joinRole == 'player'
                                      ? SvoyakTheme.gold
                                      : SvoyakTheme.border,
                                  width: 1.5,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: const Text(
                                '🎮 O\'yinchi',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: InkWell(
                            borderRadius: BorderRadius.circular(10),
                            onTap: () => setState(() => _joinRole = 'coordinator'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: _joinRole == 'coordinator'
                                    ? SvoyakTheme.blue.withValues(alpha: 0.15)
                                    : SvoyakTheme.surface,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: _joinRole == 'coordinator'
                                      ? SvoyakTheme.blue
                                      : SvoyakTheme.border,
                                  width: 1.5,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: const Text(
                                '🎤 Koordinator',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (_joinRole == 'coordinator') ...[
                      const SizedBox(height: 8),
                      const Text(
                        'Koordinator savol o\'qiydi, ball olmaydi',
                        style: TextStyle(fontSize: 11, color: SvoyakTheme.muted),
                      ),
                    ],
                  ],
                ),
              ),

              if (_errorMessage != null) ...[
                const SizedBox(height: 12),
                Text(
                  _errorMessage!,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12),
                ),
              ],
              const SizedBox(height: 20),

              // Join Button
              InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: _isBusy ? null : () => _joinRoom(_joinCodeController.text),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    gradient: SvoyakTheme.goldGradient,
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: [
                      BoxShadow(
                        color: SvoyakTheme.gold.withValues(alpha: 0.4),
                        blurRadius: 18,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    _isBusy ? 'Kirilmoqda...' : 'Kirish',
                    style: const TextStyle(
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
                onTap: _isBusy ? null : () => setState(() => _mode = _LobbyMode.menu),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.04),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    '← Orqaga',
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
    );
  }

  // ── 4. IN LOBBY ────────────────────────────────────────────────────────────
  Widget _buildInLobby() {
    final players = (_roomState?['players'] as List?) ?? [];
    final isHost = _roomState?['viewerIsHost'] == true;
    final isAutoMode = _roomState?['isAutoMode'] != false;
    final minPlayers = isAutoMode ? 1 : 2;
    final connectedPlayersCount = players.where((p) => p['status'] == 'connected').length;
    final canStart = isHost && connectedPlayersCount >= minPlayers;
    final selectedCat = _roomState?['selectedCategory'] as Map?;

    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 430),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Xona tayyor!',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Ishtirokchilar yig\'ilishini kuting',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: SvoyakTheme.muted),
            ),
            const SizedBox(height: 20),

            // Room Code Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    SvoyakTheme.gold.withValues(alpha: 0.15),
                    SvoyakTheme.orange.withValues(alpha: 0.08),
                  ],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: SvoyakTheme.gold, width: 1.5),
              ),
              child: Column(
                children: [
                  const Text(
                    'XONA KODI',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: SvoyakTheme.muted,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _activeCode ?? '...',
                    style: TextStyle(
                      fontSize: 38,
                      fontWeight: FontWeight.w900,
                      color: SvoyakTheme.gold,
                      letterSpacing: 6,
                      shadows: [
                        Shadow(
                          color: SvoyakTheme.gold.withValues(alpha: 0.6),
                          blurRadius: 20,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Share / Invite button
                      InkWell(
                        borderRadius: BorderRadius.circular(999),
                        onTap: _shareCode,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                          decoration: BoxDecoration(
                            gradient: SvoyakTheme.blueGradient,
                            borderRadius: BorderRadius.circular(999),
                            boxShadow: [
                              BoxShadow(
                                color: SvoyakTheme.blue.withValues(alpha: 0.4),
                                blurRadius: 14,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.share_rounded, size: 16, color: Colors.white),
                              SizedBox(width: 6),
                              Text(
                                'Taklif qilish',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Copy code button
                      InkWell(
                        borderRadius: BorderRadius.circular(999),
                        onTap: _copyCode,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.06),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('📋', style: TextStyle(fontSize: 13)),
                              SizedBox(width: 4),
                              Text(
                                'Nusxa olish',
                                style: TextStyle(
                                  color: SvoyakTheme.text,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Topic badge (if auto mode)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: SvoyakTheme.cardDecoration,
              child: Row(
                children: [
                  Text(
                    selectedCat != null ? (selectedCat['iconEmoji'] ?? '📚').toString() : '🎲',
                    style: const TextStyle(fontSize: 20),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'MAVZU',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: SvoyakTheme.muted,
                          letterSpacing: 1.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        selectedCat != null
                            ? '${selectedCat['iconEmoji'] ?? ''} ${selectedCat['name'] ?? ''}'
                            : 'Aralash (barcha mavzular)',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: SvoyakTheme.gold,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Players Card
            Container(
              decoration: SvoyakTheme.cardDecoration,
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Ishtirokchilar (${players.length})',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: SvoyakTheme.muted,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (players.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(12),
                      child: Center(
                        child: Text('Kutilmoqda...', style: TextStyle(color: SvoyakTheme.muted)),
                      ),
                    )
                  else
                    ...players.map((p) {
                      final name = (p['displayName'] ?? p['name'] ?? 'O\'yinchi').toString();
                      final isHostP = p['isHost'] == true;
                      final role = (p['role'] ?? 'player').toString();
                      final status = (p['status'] ?? 'connected').toString();
                      final isConnected = status == 'connected';
                      final pTid = p['telegramId'] as int? ?? 0;
                      final isMe = pTid == _currentUserTelegramId;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.25),
                          borderRadius: BorderRadius.circular(10),
                          border: isConnected
                              ? null
                              : Border.all(color: Colors.white.withValues(alpha: 0.1)),
                        ),
                        child: Row(
                          children: [
                            Text(
                              isHostP ? '👑' : role == 'coordinator' ? '🎤' : '👤',
                              style: const TextStyle(fontSize: 18),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                '$name${isMe ? ' (men)' : ''}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: SvoyakTheme.text,
                                  fontSize: 14,
                                ),
                              ),
                            ),
                            if (role == 'coordinator')
                              Container(
                                margin: const EdgeInsets.only(right: 6),
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(
                                  color: SvoyakTheme.blue.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: const Text(
                                  'Koordinator',
                                  style: TextStyle(
                                    color: SvoyakTheme.blue,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: isConnected
                                    ? SvoyakTheme.neonGreen.withValues(alpha: 0.18)
                                    : Colors.white.withValues(alpha: 0.05),
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                isConnected ? 'Ulandi' : 'Uzildi',
                                style: TextStyle(
                                  color: isConnected ? SvoyakTheme.neonGreen : SvoyakTheme.muted,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),

            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12),
              ),
            ],
            const SizedBox(height: 20),

            // Host vs Guest Buttons
            if (isHost) ...[
              InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: canStart && !_isBusy ? _startGame : null,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    gradient: canStart ? SvoyakTheme.goldGradient : null,
                    color: canStart ? null : Colors.white.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(14),
                    boxShadow: canStart
                        ? [
                            BoxShadow(
                              color: SvoyakTheme.gold.withValues(alpha: 0.4),
                              blurRadius: 18,
                              offset: const Offset(0, 6),
                            ),
                          ]
                        : null,
                  ),
                  alignment: Alignment.center,
                  child: Text(
                    _isBusy
                        ? 'Boshlanmoqda...'
                        : canStart
                            ? 'O\'yinni boshlash'
                            : 'Kamida 2 ta o\'yinchi kerak',
                    style: TextStyle(
                      color: canStart ? const Color(0xFF0B0B14) : SvoyakTheme.muted,
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 10),
              InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: _isBusy ? null : _closeRoom,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.04),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    'Xonani yopish',
                    style: TextStyle(
                      color: SvoyakTheme.text,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ] else ...[
              InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: _isBusy ? null : _leaveRoom,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.04),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                  ),
                  alignment: Alignment.center,
                  child: const Text(
                    'Xonadan chiqish',
                    style: TextStyle(
                      color: SvoyakTheme.text,
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
