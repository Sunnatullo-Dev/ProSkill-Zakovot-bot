import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_colors.dart';

/// Asosiy qobiq — 5 tabli pastki navigatsiya.
///
/// `StatefulShellRoute.indexedStack` ishlatiladi: **har tab o'z navigatsiya
/// stekini va holatini saqlaydi**. Ya'ni foydalanuvchi Reyting tabida pastga
/// aylantirib, Jamoa tabiga o'tib, qaytib kelsa — o'sha joyda qoladi.
/// Oddiy `IndexedStack` bunday qilmaydi (har tab ichida `push` qilingan
/// sahifalar yo'qoladi).
///
/// Dizayn web ilovadagi `BottomNav.tsx` bilan bir xil:
/// `[Asosiy] [Reyting]  ((SVOYAK))  [Jamoa] [Profil]` — Svoyak markazda,
/// ko'tarilgan doira tugma.
class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _svoyakBranchIndex = 2;

  void _goBranch(BuildContext context, int index) {
    HapticFeedback.selectionClick();
    navigationShell.goBranch(
      index,
      // Xuddi shu tab qayta bosilsa — o'sha tabning ildiziga qaytamiz
      // (standart mobil xatti-harakat).
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final current = navigationShell.currentIndex;

    return Scaffold(
      body: navigationShell,
      extendBody: true,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: _SvoyakButton(
        isActive: current == _svoyakBranchIndex,
        onTap: () => _goBranch(context, _svoyakBranchIndex),
      ),
      bottomNavigationBar: _BottomBar(
        currentIndex: current,
        onTap: (i) => _goBranch(context, i),
        theme: theme,
      ),
    );
  }
}

class _BottomBar extends StatelessWidget {
  const _BottomBar({
    required this.currentIndex,
    required this.onTap,
    required this.theme,
  });

  final int currentIndex;
  final ValueChanged<int> onTap;
  final ThemeData theme;

  @override
  Widget build(BuildContext context) {
    return BottomAppBar(
      color: theme.colorScheme.surface,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      height: 66,
      padding: EdgeInsets.zero,
      shape: const CircularNotchedRectangle(),
      notchMargin: 8,
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: theme.colorScheme.outline)),
        ),
        child: Row(
          children: [
            _NavItem(
              icon: Icons.home_outlined,
              activeIcon: Icons.home_rounded,
              label: 'Asosiy',
              isActive: currentIndex == 0,
              onTap: () => onTap(0),
            ),
            _NavItem(
              icon: Icons.emoji_events_outlined,
              activeIcon: Icons.emoji_events_rounded,
              label: 'Reyting',
              isActive: currentIndex == 1,
              onTap: () => onTap(1),
            ),
            // Markazdagi Svoyak tugmasi uchun bo'sh joy (FAB o'tiradi).
            const SizedBox(width: 72),
            _NavItem(
              icon: Icons.groups_outlined,
              activeIcon: Icons.groups_rounded,
              label: 'Jamoa',
              isActive: currentIndex == 3,
              onTap: () => onTap(3),
            ),
            _NavItem(
              icon: Icons.person_outline_rounded,
              activeIcon: Icons.person_rounded,
              label: 'Profil',
              isActive: currentIndex == 4,
              onTap: () => onTap(4),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
    required this.isActive,
    required this.onTap,
  });

  final IconData icon;
  final IconData activeIcon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color =
        isActive ? AppColors.gold : theme.colorScheme.onSurfaceVariant;

    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Semantics(
          selected: isActive,
          button: true,
          label: label,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 180),
                child: Icon(
                  isActive ? activeIcon : icon,
                  key: ValueKey(isActive),
                  size: 23,
                  color: color,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Markazdagi ko'tarilgan Svoyak tugmasi.
class _SvoyakButton extends StatelessWidget {
  const _SvoyakButton({required this.isActive, required this.onTap});

  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        height: 58,
        width: 58,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: AppColors.goldGradient,
          boxShadow: [
            BoxShadow(
              color: AppColors.gold.withValues(alpha: isActive ? 0.55 : 0.30),
              blurRadius: isActive ? 22 : 14,
              spreadRadius: isActive ? 2 : 0,
              offset: const Offset(0, 4),
            ),
          ],
          border: Border.all(
            color: Theme.of(context).scaffoldBackgroundColor,
            width: 3,
          ),
        ),
        child: const Center(
          child: Text(
            'S',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              color: Color(0xFF1A0A00),
              height: 1,
            ),
          ),
        ),
      ),
    );
  }
}
