import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../domain/entities/telegram_challenge.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/login_cubit.dart' show FormStatus;
import '../bloc/register_cubit.dart';

class TelegramOtpVerifyPage extends StatefulWidget {
  const TelegramOtpVerifyPage({
    super.key,
    required this.challenge,
  });

  final TelegramChallenge challenge;

  @override
  State<TelegramOtpVerifyPage> createState() => _TelegramOtpVerifyPageState();
}

class _TelegramOtpVerifyPageState extends State<TelegramOtpVerifyPage> {
  final _otpController = TextEditingController();
  final _otpFocus = FocusNode();
  int _cooldownSeconds = 60;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startCooldown();
  }

  void _startCooldown() {
    _timer?.cancel();
    setState(() => _cooldownSeconds = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_cooldownSeconds > 0) {
        setState(() => _cooldownSeconds--);
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _otpController.dispose();
    _otpFocus.dispose();
    super.dispose();
  }

  Future<void> _openTelegramBot() async {
    final raw = widget.challenge.deepLink;
    if (raw.isEmpty) return;
    try {
      final uri = Uri.parse(raw);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        context.showSnack('Telegram ilovasini ochib bo\'lmadi: $raw', isError: true);
      }
    } catch (e) {
      if (mounted) {
        context.showSnack('Havolani ochishda xatolik: $e', isError: true);
      }
    }
  }

  Future<void> _submitOtp() async {
    final code = _otpController.text.trim();
    if (code.length != 6) {
      context.showSnack('6 xonali tasdiqlash kodini to\'liq kiriting', isError: true);
      return;
    }

    final cubit = context.read<RegisterCubit>();
    final success = await cubit.verifyOtp(
      sessionToken: widget.challenge.sessionToken,
      otp: code,
    );

    if (success && mounted) {
      final session = cubit.state.session;
      if (session != null) {
        context.read<AuthBloc>().add(AuthSessionGranted(session));
        context.go(AppRoutes.home);
      }
    }
  }

  Future<void> _resendCode() async {
    if (_cooldownSeconds > 0) return;
    final cubit = context.read<RegisterCubit>();
    final msg = await cubit.resendOtpCode(sessionToken: widget.challenge.sessionToken);
    if (mounted) {
      if (msg != null) {
        context.showSnack(msg);
        _startCooldown();
      } else if (cubit.state.errorMessage != null) {
        context.showSnack(cubit.state.errorMessage!, isError: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tasdiqlash'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: BlocConsumer<RegisterCubit, RegisterState>(
          listener: (context, state) {
            if (state.errorMessage != null && state.status == FormStatus.failure) {
              context.showSnack(state.errorMessage!, isError: true);
            }
          },
          builder: (context, state) {
            return GestureDetector(
              onTap: () => FocusScope.of(context).unfocus(),
              behavior: HitTestBehavior.opaque,
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const SizedBox(height: 12),
                    Center(
                      child: Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0088CC).withValues(alpha: 0.12),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.send_rounded,
                          size: 40,
                          color: Color(0xFF0088CC),
                        ),
                      ),
                    ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),
                    const SizedBox(height: 20),
                    Text(
                      'Telegram orqali tasdiqlash',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Hisobingizni faollashtirish uchun Telegram botimiz orqali bir martalik 6 xonali tasdiqlash kodini oling.',
                      textAlign: TextAlign.center,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 28),

                    // 1-qadam: Botni ochish
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 26,
                                height: 26,
                                alignment: Alignment.center,
                                decoration: const BoxDecoration(
                                  color: AppColors.gold,
                                  shape: BoxShape.circle,
                                ),
                                child: const Text(
                                  '1',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    color: Colors.black,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Botni oching va /start tugmasini bosing',
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 14),
                          ElevatedButton.icon(
                            onPressed: _openTelegramBot,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0088CC),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            icon: const Icon(Icons.telegram, size: 22),
                            label: Text(
                              '@${widget.challenge.botUsername} botini ochish',
                              style: const TextStyle(fontWeight: FontWeight.w700),
                            ),
                          ),
                        ],
                      ),
                    ).animate().fadeIn(delay: 150.ms),

                    const SizedBox(height: 20),

                    // 2-qadam: Kodni kiritish
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.4),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Row(
                            children: [
                              Container(
                                width: 26,
                                height: 26,
                                alignment: Alignment.center,
                                decoration: const BoxDecoration(
                                  color: AppColors.gold,
                                  shape: BoxShape.circle,
                                ),
                                child: const Text(
                                  '2',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    color: Colors.black,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  '6 xonali tasdiqlash kodini kiriting',
                                  style: theme.textTheme.titleSmall?.copyWith(
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _otpController,
                            focusNode: _otpFocus,
                            keyboardType: TextInputType.number,
                            textAlign: TextAlign.center,
                            maxLength: 6,
                            enabled: !state.isSubmitting,
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 12,
                            ),
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            onChanged: (val) {
                              if (val.trim().length == 6) {
                                _submitOtp();
                              }
                            },
                            decoration: InputDecoration(
                              counterText: '',
                              hintText: '000000',
                              hintStyle: TextStyle(
                                color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                                letterSpacing: 12,
                              ),
                              contentPadding: const EdgeInsets.symmetric(vertical: 14),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ).animate().fadeIn(delay: 250.ms),

                    const SizedBox(height: 18),

                    // Qayta yuborish
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          _cooldownSeconds > 0
                              ? 'Kodni qayta so\'rash: ${_cooldownSeconds}s'
                              : 'Kod kelmadimi?',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        if (_cooldownSeconds == 0) ...[
                          const SizedBox(width: 6),
                          TextButton(
                            onPressed: state.isSubmitting ? null : _resendCode,
                            child: const Text('Qayta yuborish'),
                          ),
                        ],
                      ],
                    ),

                    const SizedBox(height: 18),

                    LoadingButton(
                      label: 'Tasdiqlash va Kirish',
                      isLoading: state.isSubmitting,
                      onPressed: _submitOtp,
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
