import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/theme/app_colors.dart';

class PremiumHistoryPage extends StatefulWidget {
  const PremiumHistoryPage({super.key});

  @override
  State<PremiumHistoryPage> createState() => _PremiumHistoryPageState();
}

class _PremiumHistoryPageState extends State<PremiumHistoryPage> {
  bool _isLoading = true;
  String? _errorMessage;
  List<Map<String, dynamic>> _history = [];

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final dio = sl<Dio>();
      final resp = await dio.get(ApiPaths.premiumHistory);
      final list = resp.data['requests'] as List? ?? resp.data['history'] as List? ?? [];
      setState(() {
        _history = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      });
    } on DioException catch (e) {
      setState(() => _errorMessage = e.message ?? 'Tarixni yuklab bo\'lmadi');
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
        title: const Text('To\'lovlar tarixi'),
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
          child: Text(_errorMessage!, textAlign: TextAlign.center),
        ),
      );
    }

    if (_history.isEmpty) {
      return const Center(child: Text('Hozircha to\'lovlar mavjud emas'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _history.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, index) {
        final item = _history[index];
        final status = (item['status'] ?? 'pending').toString().toLowerCase();
        final plan = item['plan'] ?? '1 oy';
        final rawDate = item['created_at']?.toString() ?? '';
        final date = rawDate.length >= 10 ? rawDate.substring(0, 10) : '';

        Color statusColor = Colors.orange;
        String statusText = 'Kutilmoqda';
        if (status == 'approved') {
          statusColor = Colors.green;
          statusText = 'Tasdiqlangan';
        } else if (status == 'rejected') {
          statusColor = Colors.redAccent;
          statusText = 'Rad etilgan';
        }

        return Card(
          color: Colors.white.withOpacity(0.04),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: Icon(Icons.receipt_long, color: statusColor),
            title: Text(plan.toString(), style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text(date),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: statusColor.withOpacity(0.4)),
              ),
              child: Text(
                statusText,
                style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
          ),
        );
      },
    );
  }
}
