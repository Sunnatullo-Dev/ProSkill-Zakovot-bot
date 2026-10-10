import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';

class SvoyakLobbyPage extends StatefulWidget {
  const SvoyakLobbyPage({super.key});

  @override
  State<SvoyakLobbyPage> createState() => _SvoyakLobbyPageState();
}

class _SvoyakLobbyPageState extends State<SvoyakLobbyPage> {
  bool _isLoading = true;
  String? _errorMessage;
  List<Map<String, dynamic>> _categories = [];
  final _roomCodeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _fetchCategories();
  }

  @override
  void dispose() {
    _roomCodeController.dispose();
    super.dispose();
  }

  Future<void> _fetchCategories() async {
    setState(() {
      _isLoading = true;
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
      setState(() {
        _categories = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      });
    } on DioException catch (e) {
      setState(() => _errorMessage = e.message ?? 'Kategoriyalarni yuklab bo\'lmadi');
    } catch (e) {
      setState(() => _errorMessage = 'Xatolik: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _createRoom(int categoryId) async {
    try {
      final dio = sl<Dio>();
      final resp = await dio.post(ApiPaths.svoyakRooms, data: {'category_id': categoryId});
      final code = resp.data['code'] ?? resp.data['room']?['code'];
      if (!mounted) return;
      if (code != null) {
        context.push(AppRoutes.svoyakRoom(code.toString()));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xona yaratishda xatolik: $e')));
      }
    }
  }

  void _joinWithCode() {
    final code = _roomCodeController.text.trim().toUpperCase();
    if (code.isNotEmpty) {
      context.push(AppRoutes.svoyakRoom(code));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Svoyak O\'yini'),
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
              const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 48),
              const SizedBox(height: 12),
              Text(_errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _fetchCategories, child: const Text('Qayta urinish')),
            ],
          ),
        ),
      );
    }

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0F766E), Color(0xFF115E59)],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.tealAccent.withValues(alpha: 0.3)),
          ),
          child: Column(
            children: [
              const Text('🎯', style: TextStyle(fontSize: 44)),
              const SizedBox(height: 10),
              const Text(
                'Svoyak Igra — 10 dan 50 ballgacha',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 6),
              const Text(
                'Mavzular bo\'yicha savollarni tanlang va BUZZ tugmasi bilan birinchi javob bering!',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 13),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _roomCodeController,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(
                        hintText: 'Xona kodi...',
                        fillColor: Colors.black26,
                        filled: true,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: AppColors.gold, foregroundColor: Colors.black),
                    onPressed: _joinWithCode,
                    child: const Text('Kirish'),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Text(
          'Mavzular (Yangi xona ochish)',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: AppColors.gold),
        ),
        const SizedBox(height: 12),
        if (_categories.isEmpty)
          const Padding(
            padding: EdgeInsets.all(24),
            child: Center(child: Text('Hozircha faol kategoriyalar yo\'q')),
          )
        else
          ..._categories.map((cat) {
            final id = cat['id'] as int? ?? 1;
            final title = cat['name'] ?? cat['title'] ?? 'Mavzu';
            final count = cat['questionCount'] ?? cat['question_count'] ?? 5;
            final emoji = cat['iconEmoji'] as String? ?? '🎯';
            return Card(
              margin: const EdgeInsets.only(bottom: 10),
              color: Colors.white.withValues(alpha: 0.04),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: Colors.teal.withValues(alpha: 0.2),
                  child: Text(emoji, style: const TextStyle(fontSize: 18)),
                ),
                title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text('$count ta savol'),
                trailing: FilledButton.tonal(
                  onPressed: () => _createRoom(id),
                  child: const Text('O\'ynash'),
                ),
              ),
            );
          }),
      ],
    );
  }
}
