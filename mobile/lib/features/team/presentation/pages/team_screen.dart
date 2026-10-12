import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/theme/app_colors.dart';

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});

  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _myTeam;
  List<Map<String, dynamic>> _chatMessages = [];
  final _messageController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchTeam();
  }

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _fetchTeam() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final dio = sl<Dio>();
      final resp = await dio.get(ApiPaths.teamMy);
      final teamData = resp.data['team'];
      setState(() {
        _myTeam = teamData != null ? Map<String, dynamic>.from(teamData as Map) : null;
      });

      if (_myTeam != null) {
        _fetchChat();
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        setState(() => _myTeam = null);
      } else {
        setState(() => _errorMessage = e.message ?? 'Jamoa ma\'lumotini yuklab bo\'lmadi');
      }
    } catch (e) {
      setState(() => _errorMessage = 'Xatolik: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _fetchChat() async {
    try {
      final dio = sl<Dio>();
      final resp = await dio.get(ApiPaths.teamChat);
      final list = resp.data['messages'] as List? ?? [];
      if (mounted) {
        setState(() {
          _chatMessages = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    _messageController.clear();

    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.teamChatSend, data: {'text': text});
      _fetchChat();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xabar yuborishda xatolik: $e')),
        );
      }
    }
  }

  Future<void> _createTeam(String name) async {
    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.teamCreate, data: {'name': name});
      _fetchTeam();
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? 'Jamoa yaratib bo\'lmadi';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.toString())));
      }
    }
  }

  Future<void> _joinTeam(String code) async {
    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.teamJoin, data: {'code': code});
      _fetchTeam();
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? 'Jamoaga qo\'shilib bo\'lmadi';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg.toString())));
      }
    }
  }

  Future<void> _leaveTeam() async {
    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.teamLeave);
      _fetchTeam();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Jamoani tark etishda xatolik: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Jamoalar'),
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
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
              const SizedBox(height: 12),
              Text(_errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(onPressed: _fetchTeam, child: const Text('Qayta urinish')),
            ],
          ),
        ),
      );
    }

    if (_myTeam == null) {
      return _buildNoTeamView();
    }

    return _buildTeamDashboard();
  }

  Widget _buildNoTeamView() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('👥', style: TextStyle(fontSize: 56)),
            const SizedBox(height: 16),
            const Text(
              'Siz hali jamoaga a\'zo emassiz',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            const Text(
              'O\'z jamoangizni yarating yoki do\'stingizning jamoa kodi orqali qo\'shiling.',
              style: TextStyle(color: Colors.white60, fontSize: 14),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            FilledButton.icon(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.gold,
                foregroundColor: Colors.black,
                minimumSize: const Size.fromHeight(48),
              ),
              icon: const Icon(Icons.add_circle_outline),
              label: const Text('Yangi jamoa yaratish', style: TextStyle(fontWeight: FontWeight.bold)),
              onPressed: () => _showCreateTeamDialog(),
            ),
            const SizedBox(height: 14),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(48),
                side: const BorderSide(color: AppColors.gold),
                foregroundColor: AppColors.gold,
              ),
              icon: const Icon(Icons.group_add_outlined),
              label: const Text('Kod orqali qo\'shilish'),
              onPressed: () => _showJoinTeamDialog(),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTeamDashboard() {
    final name = _myTeam?['name'] ?? 'Jamoa';
    final code = _myTeam?['code'] ?? '';
    final members = (_myTeam?['members'] as List?) ?? [];

    return RefreshIndicator(
      onRefresh: _fetchTeam,
      color: AppColors.gold,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1E3A8A), Color(0xFF172554)],
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.gold.withOpacity(0.3)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        name,
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.gold,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.exit_to_app, color: Colors.redAccent),
                      tooltip: 'Jamoani tark etish',
                      onPressed: () => _confirmLeave(),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Text('Taklif kodi: ', style: TextStyle(color: Colors.white70)),
                    SelectableText(
                      code,
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(width: 8),
                    const Icon(Icons.copy, size: 16, color: Colors.white60),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'A\'zolar soni: ${members.length} kishi',
                  style: const TextStyle(color: Colors.white60, fontSize: 13),
                ),
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 4),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Jamoa suhbati',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.gold),
              ),
            ),
          ),
          Expanded(
            child: _chatMessages.isEmpty
              ? const Center(child: Text('Hozircha xabarlar yo\'q', style: TextStyle(color: Colors.white38)))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: _chatMessages.length,
                  itemBuilder: (context, idx) {
                    final msg = _chatMessages[idx];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.05),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            msg['sender_name'] ?? 'A\'zo',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.gold, fontSize: 13),
                          ),
                          const SizedBox(height: 4),
                          Text(msg['text'] ?? '', style: const TextStyle(fontSize: 14)),
                        ],
                      ),
                    );
                  },
                ),
          ),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surface,
              border: Border(top: BorderSide(color: Colors.white.withOpacity(0.08))),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    decoration: InputDecoration(
                      hintText: 'Xabar yozing...',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  style: IconButton.styleFrom(backgroundColor: AppColors.gold),
                  icon: const Icon(Icons.send_rounded, color: Colors.black),
                  onPressed: _sendMessage,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showCreateTeamDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Yangi jamoa yaratish'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Jamoa nomi'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Bekor qilish')),
          FilledButton(
            onPressed: () {
              final name = controller.text.trim();
              if (name.isNotEmpty) {
                Navigator.pop(ctx);
                _createTeam(name);
              }
            },
            child: const Text('Yaratish'),
          ),
        ],
      ),
    );
  }

  void _showJoinTeamDialog() {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Jamoaga qo\'shilish'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: '6 xonali jamoa kodi'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Bekor qilish')),
          FilledButton(
            onPressed: () {
              final code = controller.text.trim();
              if (code.isNotEmpty) {
                Navigator.pop(ctx);
                _joinTeam(code);
              }
            },
            child: const Text('Qo\'shilish'),
          ),
        ],
      ),
    );
  }

  void _confirmLeave() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Jamoani tark etish'),
        content: const Text('Haqiqatan ham jamoangizdan chiqmoqchimisiz?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Bekor qilish')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () {
              Navigator.pop(ctx);
              _leaveTeam();
            },
            child: const Text('Chiqish'),
          ),
        ],
      ),
    );
  }
}
