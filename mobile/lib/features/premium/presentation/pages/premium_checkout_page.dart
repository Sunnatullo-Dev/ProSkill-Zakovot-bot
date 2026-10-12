import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/network/api_paths.dart';
import '../../../../core/theme/app_colors.dart';

class PremiumCheckoutPage extends StatefulWidget {
  const PremiumCheckoutPage({super.key});

  @override
  State<PremiumCheckoutPage> createState() => _PremiumCheckoutPageState();
}

class _PremiumCheckoutPageState extends State<PremiumCheckoutPage> {
  final _noteController = TextEditingController();
  String _selectedPlan = '1_month';
  bool _isLoading = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _submitRequest() async {
    setState(() => _isLoading = true);

    try {
      final dio = sl<Dio>();
      await dio.post(
        ApiPaths.premiumRequest,
        data: {
          'plan': _selectedPlan,
          'note': _noteController.text.trim(),
        },
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('To\'lov cheki qabul qilindi! Admin tasdiqlagach faollashadi.'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Xatolik: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('To\'lovni tasdiqlash'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Tarifni tanlang',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.gold),
            ),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: '1_month', label: Text('1 oy')),
                ButtonSegment(value: '3_months', label: Text('3 oy')),
                ButtonSegment(value: '1_year', label: Text('1 yil')),
              ],
              selected: {_selectedPlan},
              onSelectionChanged: (val) => setState(() => _selectedPlan = val.first),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _noteController,
              maxLines: 4,
              decoration: InputDecoration(
                labelText: 'Tranzaksiya ma\'lumotlari / Chek izohi',
                hintText: 'To\'lov vaqti, karta oxirgi 4 ta raqami yoki chek havolasini yozing...',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
              ),
            ),
            const SizedBox(height: 28),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.gold,
                foregroundColor: Colors.black,
                minimumSize: const Size.fromHeight(52),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              ),
              onPressed: _isLoading ? null : _submitRequest,
              child: _isLoading
                  ? const CircularProgressIndicator(color: Colors.black)
                  : const Text('Chekni Yuborish', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }
}
