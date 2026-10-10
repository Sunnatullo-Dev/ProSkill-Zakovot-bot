import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class AchievementsPage extends StatelessWidget {
  const AchievementsPage({super.key});

  static const List<Map<String, dynamic>> allAchievements = [
    {
      'id': 'first-game',
      'icon': '🌱',
      'title': 'Birinchi Qadam',
      'description': 'Birinchi Zakovat o\'yinini yakunlang',
      'points': 10,
    },
    {
      'id': 'score-50',
      'icon': '⭐',
      'title': 'Boshlovchi Bilimdon',
      'description': 'Jami 50 ball to\'plang',
      'points': 25,
    },
    {
      'id': 'score-100',
      'icon': '🔥',
      'title': 'Zakovat Ustasi',
      'description': 'Jami 100 ball to\'plang',
      'points': 50,
    },
    {
      'id': 'streak-7',
      'icon': '📅',
      'title': 'Haftalik Bardavomlik',
      'description': 'Ketma-ket 7 kun o\'yinda qatnashing',
      'points': 70,
    },
    {
      'id': 'perfect-round',
      'icon': '👑',
      'title': 'Mutlaq G\'alaba',
      'description': 'Raunddagi barcha savollarga 100% to\'g\'ri javob bering',
      'points': 100,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = context.watch<AuthBloc>().state;
    final user = authState.user;
    final unlocked = user?.unlockedAchievements ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Yutuqlar'),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF2E1065), Color(0xFF1E1B4B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.gold.withOpacity(0.3)),
            ),
            child: Row(
              children: [
                const Text('🎖️', style: TextStyle(fontSize: 40)),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Ochilgan yutuqlar: ${unlocked.length} / ${allAchievements.length}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.gold,
                        ),
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: allAchievements.isNotEmpty
                              ? unlocked.length / allAchievements.length
                              : 0,
                          backgroundColor: Colors.white12,
                          color: AppColors.gold,
                          minHeight: 8,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          ...allAchievements.map((ach) {
            final isUnlocked = unlocked.contains(ach['id']);
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: isUnlocked
                    ? theme.colorScheme.surfaceContainerHighest.withOpacity(0.6)
                    : Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isUnlocked
                      ? AppColors.gold.withOpacity(0.4)
                      : Colors.white.withOpacity(0.06),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isUnlocked
                          ? AppColors.gold.withOpacity(0.15)
                          : Colors.white.withOpacity(0.05),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      ach['icon'] as String,
                      style: TextStyle(
                        fontSize: 26,
                        color: isUnlocked ? null : Colors.grey,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          ach['title'] as String,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                            color: isUnlocked ? Colors.white : Colors.white60,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          ach['description'] as String,
                          style: TextStyle(
                            fontSize: 13,
                            color: isUnlocked
                                ? theme.colorScheme.onSurfaceVariant
                                : Colors.white38,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (isUnlocked)
                    const Icon(Icons.check_circle_rounded, color: Colors.greenAccent, size: 24)
                  else
                    const Icon(Icons.lock_outline_rounded, color: Colors.white30, size: 24),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}
