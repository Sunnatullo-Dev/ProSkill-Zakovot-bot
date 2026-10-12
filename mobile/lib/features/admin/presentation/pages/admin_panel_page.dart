import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/theme/app_colors.dart';

class AdminPanelPage extends StatefulWidget {
  const AdminPanelPage({super.key});

  @override
  State<AdminPanelPage> createState() => _AdminPanelPageState();
}

class _AdminPanelPageState extends State<AdminPanelPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  String? _errorMessage;

  // Stats
  Map<String, dynamic>? _stats;

  // Questions
  List<Map<String, dynamic>> _questions = [];

  // Channels
  List<Map<String, dynamic>> _channels = [];

  // Premium Requests
  List<Map<String, dynamic>> _premiumRequests = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _fetchAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _fetchAllData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final dio = sl<Dio>();
      final results = await Future.wait([
        dio.get(ApiPaths.adminStats).catchError((_) => Response(requestOptions: RequestOptions(), data: {})),
        dio.get(ApiPaths.adminQuestions).catchError((_) => Response(requestOptions: RequestOptions(), data: {'questions': []})),
        dio.get(ApiPaths.adminChannels).catchError((_) => Response(requestOptions: RequestOptions(), data: {'channels': []})),
        dio.get(ApiPaths.adminPremiumRequests).catchError((_) => Response(requestOptions: RequestOptions(), data: {'requests': []})),
      ]);

      if (!mounted) return;
      List safeList(dynamic data, String key) {
        if (data is Map) {
          final val = data[key] ?? data['items'] ?? data['data'];
          if (val is List) return val;
        } else if (data is List) {
          return data;
        }
        return [];
      }

      setState(() {
        _stats = results[0].data is Map ? Map<String, dynamic>.from(results[0].data as Map) : {};
        final qList = safeList(results[1].data, 'questions');
        _questions = qList.map((e) => Map<String, dynamic>.from(e as Map)).toList();

        final cList = safeList(results[2].data, 'channels');
        _channels = cList.map((e) => Map<String, dynamic>.from(e as Map)).toList();

        final pList = safeList(results[3].data, 'requests');
        _premiumRequests = pList.map((e) => Map<String, dynamic>.from(e as Map)).toList();

        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = 'Admin ma\'lumotlarini yuklashda xatolik: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _addChannel(String title, String url, String channelId) async {
    try {
      final dio = sl<Dio>();
      await dio.post(ApiPaths.adminChannels, data: {
        'channel_title': title,
        'channel_url': url,
        'channel_id': channelId,
      });
      _fetchAllData();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xatolik: $e')));
      }
    }
  }

  Future<void> _deleteChannel(dynamic id) async {
    try {
      final dio = sl<Dio>();
      await dio.delete('${ApiPaths.adminChannels}/$id');
      _fetchAllData();
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
        title: const Text('Admin Boshqaruv Paneli'),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          indicatorColor: AppColors.gold,
          labelColor: AppColors.gold,
          unselectedLabelColor: Colors.white60,
          tabs: const [
            Tab(icon: Icon(Icons.analytics_outlined), text: 'Statistika'),
            Tab(icon: Icon(Icons.quiz_outlined), text: 'Savollar'),
            Tab(icon: Icon(Icons.campaign_outlined), text: 'Kanallar'),
            Tab(icon: Icon(Icons.payment_outlined), text: 'Premium'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.gold))
          : TabBarView(
              controller: _tabController,
              children: [
                _buildStatsTab(),
                _buildQuestionsTab(),
                _buildChannelsTab(),
                _buildPremiumTab(),
              ],
            ),
    );
  }

  Widget _buildStatsTab() {
    final totalUsers = _stats?['total_users'] ?? _stats?['totalUsers'] ?? 0;
    final totalQuestions = _stats?['total_questions'] ?? _stats?['totalQuestions'] ?? 0;
    final totalGames = _stats?['total_games'] ?? _stats?['totalGames'] ?? 0;
    final premiumUsers = _stats?['premium_users'] ?? _stats?['premiumUsers'] ?? 0;

    return RefreshIndicator(
      onRefresh: _fetchAllData,
      color: AppColors.gold,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Row(
            children: [
              Expanded(child: _buildStatCard('Foydalanuvchilar', '$totalUsers', Icons.people, Colors.blueAccent)),
              const SizedBox(width: 12),
              Expanded(child: _buildStatCard('Savollar Bazasi', '$totalQuestions', Icons.help_outline, Colors.purpleAccent)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildStatCard('O\'ynalgan O\'yinlar', '$totalGames', Icons.sports_esports, Colors.greenAccent)),
              const SizedBox(width: 12),
              Expanded(child: _buildStatCard('Premium A\'zolar', '$premiumUsers', Icons.star, Colors.amberAccent)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 12),
          Text(value, style: const TextStyle(fontSize: 26, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(title, style: const TextStyle(color: Colors.white60, fontSize: 13)),
        ],
      ),
    );
  }

  Widget _buildQuestionsTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Jami savollar: ${_questions.length}', style: const TextStyle(fontWeight: FontWeight.bold)),
              IconButton.filled(
                style: IconButton.styleFrom(backgroundColor: AppColors.gold),
                icon: const Icon(Icons.add, color: Colors.black),
                onPressed: () => _showAddQuestionDialog(),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: _questions.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (context, index) {
              final q = _questions[index];
              return Card(
                color: Colors.white.withOpacity(0.03),
                child: ListTile(
                  title: Text(q['question'] ?? q['text'] ?? '', maxLines: 2, overflow: TextOverflow.ellipsis),
                  subtitle: Text('Javob: ${q['answer'] ?? q['correctAnswer'] ?? ''}', style: const TextStyle(color: Colors.greenAccent)),
                  trailing: Text('${q['difficulty'] ?? ''}', style: const TextStyle(color: AppColors.gold, fontSize: 12)),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildChannelsTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Majburiy kanallar ro\'yxati', style: TextStyle(fontWeight: FontWeight.bold)),
              FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: AppColors.gold, foregroundColor: Colors.black),
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Kanal qo\'shish'),
                onPressed: () => _showAddChannelDialog(),
              ),
            ],
          ),
        ),
        Expanded(
          child: _channels.isEmpty
              ? const Center(child: Text('Majburiy kanallar mavjud emas'))
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _channels.length,
                  itemBuilder: (context, index) {
                    final ch = _channels[index];
                    final title = ch['channel_title'] ?? ch['title'] ?? 'Kanal';
                    final url = ch['channel_url'] ?? ch['url'] ?? '';
                    final id = ch['id'];

                    return Card(
                      color: Colors.white.withOpacity(0.03),
                      child: ListTile(
                        leading: const Icon(Icons.campaign, color: Colors.blueAccent),
                        title: Text(title.toString()),
                        subtitle: Text(url.toString(), style: const TextStyle(fontSize: 12, color: Colors.white60)),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                          onPressed: () => _deleteChannel(id),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildPremiumTab() {
    return _premiumRequests.isEmpty
        ? const Center(child: Text('Kutilayotgan to\'lov so\'rovlari yo\'q'))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _premiumRequests.length,
            itemBuilder: (context, index) {
              final req = _premiumRequests[index];
              return Card(
                color: Colors.white.withOpacity(0.03),
                child: ListTile(
                  leading: const Icon(Icons.payment, color: AppColors.gold),
                  title: Text('Foydalanuvchi #${req['user_id'] ?? req['telegram_id']}'),
                  subtitle: Text('Tarif: ${req['plan']} | Izoh: ${req['note'] ?? ''}'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.check_circle, color: Colors.green),
                        onPressed: () {
                          // Approve
                        },
                      ),
                      IconButton(
                        icon: const Icon(Icons.cancel, color: Colors.redAccent),
                        onPressed: () {
                          // Reject
                        },
                      ),
                    ],
                  ),
                ),
              );
            },
          );
  }

  void _showAddChannelDialog() {
    final titleCtrl = TextEditingController();
    final urlCtrl = TextEditingController();
    final idCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Kanal qo\'shish'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: titleCtrl, decoration: const InputDecoration(labelText: 'Kanal nomi')),
            TextField(controller: urlCtrl, decoration: const InputDecoration(labelText: 'Kanal havolasi (t.me/...)')),
            TextField(controller: idCtrl, decoration: const InputDecoration(labelText: 'Telegram Chat ID (-100...)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Bekor qilish')),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              _addChannel(titleCtrl.text.trim(), urlCtrl.text.trim(), idCtrl.text.trim());
            },
            child: const Text('Qo\'shish'),
          ),
        ],
      ),
    );
  }

  void _showAddQuestionDialog() {
    final textCtrl = TextEditingController();
    final ansCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Yangi savol qo\'shish'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: textCtrl, maxLines: 3, decoration: const InputDecoration(labelText: 'Savol matni')),
            TextField(controller: ansCtrl, decoration: const InputDecoration(labelText: 'To\'g\'ri javob')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Bekor qilish')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final dio = sl<Dio>();
                await dio.post(ApiPaths.adminQuestions, data: {
                  'text': textCtrl.text.trim(),
                  'answer': ansCtrl.text.trim(),
                  'difficulty': 'medium',
                });
                _fetchAllData();
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Xatolik: $e')));
                }
              }
            },
            child: const Text('Saqlash'),
          ),
        ],
      ),
    );
  }
}
