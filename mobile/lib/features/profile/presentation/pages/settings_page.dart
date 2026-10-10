import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../auth/data/models/user_model.dart';
import '../../../auth/presentation/bloc/auth_bloc.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  bool _soundEnabled = true;
  bool _vibrationEnabled = true;

  @override
  void initState() {
    super.initState();
    final prefs = sl<SharedPreferences>();
    _soundEnabled = prefs.getBool('app_sound_enabled') ?? true;
    _vibrationEnabled = prefs.getBool('app_vibration_enabled') ?? true;
  }

  void _toggleSound(bool val) {
    setState(() => _soundEnabled = val);
    sl<SharedPreferences>().setBool('app_sound_enabled', val);
  }

  void _toggleVibration(bool val) {
    setState(() => _vibrationEnabled = val);
    sl<SharedPreferences>().setBool('app_vibration_enabled', val);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authState = context.watch<AuthBloc>().state;
    final user = authState.user;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sozlamalar'),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _SectionHeader('O\'yin va effektlar'),
          SwitchListTile(
            secondary: const Icon(Icons.volume_up_rounded, color: AppColors.gold),
            title: const Text('Ovoz effektlari'),
            subtitle: const Text('Taymer, to\'g\'ri/xato javob tovushlari'),
            value: _soundEnabled,
            onChanged: _toggleSound,
          ),
          SwitchListTile(
            secondary: const Icon(Icons.vibration_rounded, color: AppColors.gold),
            title: const Text('Tebranish (Haptic)'),
            subtitle: const Text('Tugmalar bosilganda tebranish'),
            value: _vibrationEnabled,
            onChanged: _toggleVibration,
          ),
          const SizedBox(height: 24),
          _SectionHeader('Xavfsizlik va Akkaunt'),
          ListTile(
            leading: const Icon(Icons.lock_reset_rounded, color: AppColors.gold),
            title: const Text('Parolni o\'zgartirish'),
            subtitle: const Text('Yangi parol o\'rnatish'),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => context.push(AppRoutes.changePassword),
          ),
          if (user?.isAppAccount ?? false)
            ListTile(
              leading: const Icon(Icons.send_rounded, color: Color(0xFF229ED9)),
              title: const Text('Telegram akkauntni bog\'lash'),
              subtitle: Text(
                user?.username != null
                    ? '@${user!.username}'
                    : 'Telegram hisobingizga ulang',
              ),
              trailing: const Icon(Icons.chevron_right_rounded),
              onTap: () => _linkTelegramAccount(context),
            ),
          const SizedBox(height: 24),
          _SectionHeader('Ilova haqida'),
          ListTile(
            leading: const Icon(Icons.info_outline_rounded, color: AppColors.gold),
            title: const Text('Versiya'),
            trailing: Text(
              '1.0.0 (Release)',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
          const SizedBox(height: 32),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.redAccent,
              side: const BorderSide(color: Colors.redAccent),
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Akkauntdan chiqish'),
            onPressed: () => _confirmLogout(context),
          ),
        ],
      ),
    );
  }

  Future<void> _linkTelegramAccount(BuildContext context) async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final dio = sl<Dio>();
      final res = await dio.post(ApiPaths.createTelegramLinkToken);
      if (!context.mounted) return;
      Navigator.pop(context);

      final data = res.data as Map<String, dynamic>;
      final linkUrl = data['linkUrl'] as String? ?? '';
      final botUsername = data['botUsername'] as String? ?? 'ZakovatOyinBot';

      _showLinkBottomSheet(context, linkUrl, botUsername);
    } catch (e) {
      if (!context.mounted) return;
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Xatolik: ${e.toString()}'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  void _showLinkBottomSheet(
    BuildContext context,
    String linkUrl,
    String botUsername,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (bottomSheetContext) {
        bool checking = false;

        return StatefulBuilder(
          builder: (sheetContext, setSheetState) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Container(
                      width: 48,
                      height: 5,
                      decoration: BoxDecoration(
                        color: Colors.grey.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF229ED9).withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.send_rounded,
                          color: Color(0xFF229ED9),
                          size: 32,
                        ),
                      ),
                      const SizedBox(width: 16),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Telegram akkauntni bog\'lash',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Barcha ballar va tarixingiz birlashtiriladi',
                              style: TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Theme.of(sheetContext).cardColor,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
                    ),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Qanday ishlaydi?',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        SizedBox(height: 8),
                        Text(
                          '1. Pastdagi tugmani bosib Telegram botga o\'ting.\n'
                          '2. Botdagi "Start" tugmasini bosing.\n'
                          '3. Ilovaga qaytib "Tekshirish" tugmasini bosing.',
                          style: TextStyle(fontSize: 13, height: 1.4),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF229ED9),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    icon: const Icon(Icons.open_in_new_rounded),
                    label: const Text(
                      'Telegram botda ochish',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                    onPressed: () async {
                      if (linkUrl.isNotEmpty) {
                        final uri = Uri.parse(linkUrl);
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        }
                      }
                    },
                  ),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    icon: checking
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.refresh_rounded),
                    label: Text(checking ? 'Tekshirilmoqda...' : 'Holatni tekshirish'),
                    onPressed: checking
                        ? null
                        : () async {
                            setSheetState(() => checking = true);
                            try {
                              final dio = sl<Dio>();
                              final statusRes = await dio.get(ApiPaths.telegramLinkStatus);
                              final isLinked = (statusRes.data['isLinked'] as bool?) ?? false;

                              if (isLinked) {
                                final meRes = await dio.get(ApiPaths.me);
                                final userJson = meRes.data['user'] as Map<String, dynamic>;
                                final updatedUser = UserModel.fromJson(userJson).toEntity();
                                if (context.mounted) {
                                  context.read<AuthBloc>().add(AuthUserUpdated(updatedUser));
                                  Navigator.pop(bottomSheetContext);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('🎉 Hisobingiz Telegram bilan muvaffaqiyatli bog\'landi!'),
                                      backgroundColor: Colors.green,
                                    ),
                                  );
                                }
                              } else {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('Hali botda tasdiqlanmadi. Iltimos, botdagi Start tugmasini bosing.'),
                                    ),
                                  );
                                }
                              }
                            } catch (e) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text('Xatolik: $e')),
                                );
                              }
                            } finally {
                              setSheetState(() => checking = false);
                            }
                          },
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Chiqishni tasdiqlang'),
        content: const Text('Haqiqatan ham hisobingizdan chiqmoqchimisiz?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Bekor qilish'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthBloc>().add(const AuthLogoutRequested());
            },
            child: const Text('Chiqish'),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        title.toUpperCase(),
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.gold,
              letterSpacing: 1.2,
              fontWeight: FontWeight.bold,
            ),
      ),
    );
  }
}
