import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/utils/validators.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../domain/entities/telegram_challenge.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/forgot_password_cubit.dart';
import '../bloc/login_cubit.dart' show FormStatus;

class ResetPasswordPage extends StatelessWidget {
  const ResetPasswordPage({
    super.key,
    required this.challenge,
    this.cubit,
  });

  final TelegramChallenge challenge;
  final ForgotPasswordCubit? cubit;

  @override
  Widget build(BuildContext context) {
    if (cubit != null) {
      return BlocProvider.value(
        value: cubit!,
        child: _ResetPasswordView(challenge: challenge),
      );
    }
    return BlocProvider(
      create: (_) => ForgotPasswordCubit(
        forgotPassword: sl(),
        resetPassword: sl(),
        resendOtp: sl(),
      ),
      child: _ResetPasswordView(challenge: challenge),
    );
  }
}

class _ResetPasswordView extends StatefulWidget {
  const _ResetPasswordView({required this.challenge});

  final TelegramChallenge challenge;

  @override
  State<_ResetPasswordView> createState() => _ResetPasswordViewState();
}

class _ResetPasswordViewState extends State<_ResetPasswordView> {
  final _formKey = GlobalKey<FormState>();
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  final _passwordFocus = FocusNode();
  final _confirmFocus = FocusNode();

  int _cooldownSeconds = 60;
  Timer? _timer;
  double _strength = 0;

  @override
  void initState() {
    super.initState();
    _startCooldown();
    _passwordController.addListener(() {
      final next = Validators.passwordStrength(_passwordController.text);
      if (next != _strength) setState(() => _strength = next);
    });
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
    _passwordController.dispose();
    _confirmController.dispose();
    _passwordFocus.dispose();
    _confirmFocus.dispose();
    super.dispose();
  }

  Future<void> _openTelegramBot() async {
    final raw = widget.challenge.deepLink;
    if (raw.isEmpty) return;
    try {
      final uri = Uri.parse(raw);
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      if (mounted) {
        context.showSnack('Havolani ochib bo\'lmadi: $e', isError: true);
      }
    }
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final otp = _otpController.text.trim();
    if (otp.length != 6) {
      context.showSnack('6 xonali tasdiqlash kodini to\'liq kiriting', isError: true);
      return;
    }

    final cubit = context.read<ForgotPasswordCubit>();
    final success = await cubit.resetPassword(
      sessionToken: widget.challenge.sessionToken,
      otp: otp,
      newPassword: _passwordController.text,
    );

    if (success && mounted) {
      context.showSnack('Parolingiz muvaffaqiyatli yangilandi! 🎉');
      final session = cubit.state.session;
      if (session != null) {
        context.read<AuthBloc>().add(AuthSessionGranted(session));
        context.go(AppRoutes.home);
      } else {
        context.go(AppRoutes.login);
      }
    }
  }

  Future<void> _resendCode() async {
    if (_cooldownSeconds > 0) return;
    final cubit = context.read<ForgotPasswordCubit>();
    final msg = await cubit.resendOtp(widget.challenge.sessionToken);
    if (mounted) {
      if (msg != null) {
        context.showSnack(msg);
        _startCooldown();
      } else if (cubit.state.errorMessage != null) {
        context.showSnack(cubit.state.errorMessage!, isError: true);
      }
    }
  }

  Color get _strengthColor {
    if (_strength < 0.35) return AppColors.error;
    if (_strength < 0.7) return AppColors.warning;
    return AppColors.success;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Yangi parol'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: BlocConsumer<ForgotPasswordCubit, ForgotPasswordState>(
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
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 12),
                      Center(
                        child: Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: const Color(0xFF0088CC).withValues(alpha: 0.12),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.telegram_rounded,
                            size: 42,
                            color: Color(0xFF0088CC),
                          ),
                        ),
                      ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),
                      const SizedBox(height: 16),
                      Text(
                        'Yangi parol o\'rnatish',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Telegram botga yuborilgan 6 xonali kodni va yangi parolingizni kiriting.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Bot tugmasi
                      OutlinedButton.icon(
                        onPressed: _openTelegramBot,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF0088CC),
                          side: const BorderSide(color: Color(0xFF0088CC)),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        icon: const Icon(Icons.telegram, size: 20),
                        label: Text('@${widget.challenge.botUsername} botini ochish'),
                      ),

                      const SizedBox(height: 24),

                      // OTP kod
                      Text(
                        'Tasdiqlash kodi',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _otpController,
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        maxLength: 6,
                        enabled: !state.isSubmitting,
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 10,
                        ),
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                        ],
                        decoration: InputDecoration(
                          counterText: '',
                          hintText: '000000',
                          hintStyle: TextStyle(
                            color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                            letterSpacing: 10,
                          ),
                          contentPadding: const EdgeInsets.symmetric(vertical: 12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),

                      // Resend countdown
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: (_cooldownSeconds == 0 && !state.isSubmitting)
                              ? _resendCode
                              : null,
                          child: Text(
                            _cooldownSeconds > 0
                                ? 'Qayta yuborish (${_cooldownSeconds}s)'
                                : 'Kodni qayta yuborish',
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Yangi parol
                      TextFormField(
                        controller: _passwordController,
                        focusNode: _passwordFocus,
                        enabled: !state.isSubmitting,
                        obscureText: state.obscurePassword,
                        textInputAction: TextInputAction.next,
                        validator: Validators.password,
                        decoration: InputDecoration(
                          labelText: 'Yangi parol',
                          prefixIcon: const Icon(Icons.lock_outline_rounded),
                          suffixIcon: IconButton(
                            onPressed: context
                                .read<ForgotPasswordCubit>()
                                .togglePasswordVisibility,
                            icon: Icon(
                              state.obscurePassword
                                  ? Icons.visibility_outlined
                                  : Icons.visibility_off_outlined,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 6),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(2),
                        child: LinearProgressIndicator(
                          value: _strength,
                          minHeight: 4,
                          backgroundColor: theme.colorScheme.surfaceContainerHighest,
                          valueColor: AlwaysStoppedAnimation(_strengthColor),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Parolni tasdiqlash
                      TextFormField(
                        controller: _confirmController,
                        focusNode: _confirmFocus,
                        enabled: !state.isSubmitting,
                        obscureText: state.obscurePassword,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _submit(),
                        validator: (v) => Validators.confirmPassword(
                          v,
                          _passwordController.text,
                        ),
                        decoration: const InputDecoration(
                          labelText: 'Parolni tasdiqlang',
                          prefixIcon: Icon(Icons.lock_reset_rounded),
                        ),
                      ),

                      const SizedBox(height: 28),

                      LoadingButton(
                        label: 'Parolni yangilash',
                        isLoading: state.isSubmitting,
                        onPressed: _submit,
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
