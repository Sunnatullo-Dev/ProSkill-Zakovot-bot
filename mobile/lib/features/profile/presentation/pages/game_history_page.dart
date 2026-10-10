import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/theme/app_colors.dart';

class GameHistoryPage extends StatefulWidget {
  const GameHistoryPage({super.key});

  @override
  State<GameHistoryPage> createState() => _GameHistoryPageState();
}

class _GameHistoryPageState extends State<GameHistoryPage> {
  bool _isLoading = true;
  String? _errorMessage;
  List<Map<String, dynamic>> _results = [];

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  Future<void> _fetchHistory() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final dio = sl<Dio>();
      final resp = await dio.get(ApiPaths.gameHistory);
      final list = resp.data['results'] as List? ?? [];
      setState(() {
        _results = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      });
    } on DioException catch (e) {
      setState(() => _errorMessage = e.message ?? 'Tarixni yuklashda xatolik');
    } catch (e) {
      setState(() => _errorMessage = 'Xatolik: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('O\'yin tarixi'),
        centerTitle: true,
      ),
      body: _buildBody(theme),
    );
  }

  Widget _buildBody(ThemeData theme) {
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
              const Icon(Icons.error_outline_rounded, size: 48, color: Colors.redAccent),
              const SizedBox(height: 12),
              Text(_errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _fetchHistory,
                child: const Text('Qayta urinish'),
              ),
            ],
          ),
        ),
      );
    }

    if (_results.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('📜', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 12),
              Text(
                'Hali o\'yinlar o\'ynalmagan',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 6),
              Text(
                'Yakka o\'yin yoki kunlik topshiriqni boshlang!',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchHistory,
      color: AppColors.gold,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: _results.length,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final item = _results[index];
          final correct = item['correctCount'] ?? 0;
          final total = item['totalCount'] ?? 0;
          final score = item['roundScore'] ?? 0;
          final rawDate = item['createdAt'] as String?;
          final dateStr = rawDate != null && rawDate.length >= 10
              ? rawDate.substring(0, 10)
              : '';

          final percent = total > 0 ? (correct / total * 100).toInt() : 0;
          final isGood = percent >= 70;

          return Card(
            elevation: 0,
            color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
              side: BorderSide(
                color: isGood
                    ? AppColors.gold.withOpacity(0.3)
                    : Colors.white.withOpacity(0.05),
              ),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isGood
                          ? AppColors.gold.withOpacity(0.15)
                          : Colors.grey.withOpacity(0.15),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '$percent%',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: isGood ? AppColors.gold : Colors.white70,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$correct / $total to\'g\'ri javob',
                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          dateStr,
                          style: TextStyle(
                            fontSize: 12,
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.gold.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '+$score ball',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: AppColors.gold,
                        fontSize: 13,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
