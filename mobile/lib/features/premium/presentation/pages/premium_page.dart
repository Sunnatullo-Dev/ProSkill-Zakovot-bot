import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';

class PremiumPage extends StatefulWidget {
  const PremiumPage({super.key});

  @override
  State<PremiumPage> createState() => _PremiumPageState();
}

class _PremiumPageState extends State<PremiumPage> {
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _info;

  @override
  void initState() {
    super.initState();
    _fetchInfo();
  }

  Future<void> _fetchInfo() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final dio = sl<Dio>();
      final resp = await dio.get(ApiPaths.premiumInfo);
      setState(() {
        _info = Map<String, dynamic>.from(resp.data);
      });
    } on DioException catch (e) {
      setState(() => _errorMessage = e.message ?? 'Ma\'lumotlarni yuklab bo\'lmadi');
    } catch (e) {
      setState(() => _errorMessage = 'Xatolik: $e');
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Zakovat Premium'),
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            tooltip: 'Tarix',
            onPressed: () => context.push(AppRoutes.premiumHistory),
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
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline_rounded, color: AppColors.error, size: 48),
              const SizedBox(height: 12),
              Text(_errorMessage!, textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: _fetchInfo, child: const Text('Qayta urinish')),
            ],
          ),
        ),
      );
    }

    final card = _info?['card_number'] ?? _info?['cardNumber'] ?? '8600 0000 0000 0000';
    final cardHolder = _info?['card_holder'] ?? _info?['cardHolder'] ?? 'ZAKOVAT APP';
    final price = _info?['price'] ?? '25 000 so\'m / oy';

    return ListView(
      padding: const EdgeInsets.all(20),
      children: [
        // PRO KARTA
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF78350F), Color(0xFF451A03)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.gold, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: AppColors.gold.withOpacity(0.2),
                blurRadius: 16,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('⭐ PREMIUM STATUS', style: TextStyle(fontWeight: FontWeight.w900, color: AppColors.gold, letterSpacing: 1.5)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: AppColors.gold, borderRadius: BorderRadius.circular(12)),
                    child: const Text('PRO', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(price.toString(), style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 20),
              const Text('To\'lov uchun karta:', style: TextStyle(color: Colors.white70, fontSize: 13)),
              const SizedBox(height: 4),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(card.toString(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 1.5)),
                  IconButton(
                    icon: const Icon(Icons.copy, color: AppColors.gold),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: card.toString()));
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Karta raqami nusxalandi!')));
                    },
                  ),
                ],
              ),
              Text(cardHolder.toString(), style: const TextStyle(color: Colors.white60, fontSize: 13)),
            ],
          ),
        ),
        const SizedBox(height: 28),

        const Text('Premium Imtiyozlari', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.gold)),
        const SizedBox(height: 14),

        _buildPerk('♾️', 'Cheksiz o\'yinlar', 'Kunlik savol va raundlar cheklovisiz to\'liq erkin o\'yin'),
        _buildPerk('🎯', 'Barcha kategoriyalar', 'Svoyak va maxsus qiyinlikdagi barcha savollar bazasi ochiq'),
        _buildPerk('👑', 'Maxsus PRO nishoni', 'Reyting va profilda oltin PRO nishoni bilan ajralib turing'),
        _buildPerk('🤖', 'Ustoz AI yordamchisi', 'Sun\'iy intellekt orqali chuqur tahlil va mashqlar'),

        const SizedBox(height: 32),
        FilledButton(
          style: FilledButton.styleFrom(
            backgroundColor: AppColors.gold,
            foregroundColor: Colors.black,
            minimumSize: const Size.fromHeight(54),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          onPressed: () => context.push(AppRoutes.premiumCheckout),
          child: const Text('To\'lov chekini yuborish', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildPerk(String emoji, String title, String desc) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Text(emoji, style: const TextStyle(fontSize: 28)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 2),
                Text(desc, style: const TextStyle(color: Colors.white60, fontSize: 13)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
