import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../shared/utils/validators.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../../../shared/widgets/phone_field.dart';
import '../bloc/forgot_password_cubit.dart';
import '../bloc/login_cubit.dart' show FormStatus;

class ForgotPasswordPage extends StatelessWidget {
  const ForgotPasswordPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => ForgotPasswordCubit(
        forgotPassword: sl(),
        resetPassword: sl(),
        resendOtp: sl(),
      ),
      child: const _ForgotPasswordView(),
    );
  }
}

class _ForgotPasswordView extends StatefulWidget {
  const _ForgotPasswordView();

  @override
  State<_ForgotPasswordView> createState() => _ForgotPasswordViewState();
}

class _ForgotPasswordViewState extends State<_ForgotPasswordView> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final phone = Validators.normalizePhone(_phoneController.text);
    final cubit = context.read<ForgotPasswordCubit>();
    final success = await cubit.sendRecoveryRequest(phone);

    if (success && mounted) {
      final challenge = cubit.state.challenge;
      if (challenge != null) {
        context.push(
          AppRoutes.resetPassword,
          extra: {
            'challenge': challenge,
            'cubit': cubit,
          },
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Parolni tiklash'),
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
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 20),
                      Center(
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primaryContainer.withValues(alpha: 0.3),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.lock_reset_rounded,
                            size: 42,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                      ).animate().scale(duration: 400.ms, curve: Curves.easeOutBack),
                      const SizedBox(height: 24),
                      Text(
                        'Parolni unutdingizmi?',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Ro\'yxatdan o\'tgan telefon raqamingizni kiriting. Biz Telegram botingizga bir martalik tasdiqlash kodini yuboramiz.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurfaceVariant,
                        ),
                      ),
                      const SizedBox(height: 32),

                      PhoneField(
                        controller: _phoneController,
                        enabled: !state.isSubmitting,
                        onSubmitted: (_) => _submit(),
                      ),
                      const SizedBox(height: 24),

                      LoadingButton(
                        label: 'Kodni olish',
                        isLoading: state.isSubmitting,
                        onPressed: _submit,
                      ),

                      const SizedBox(height: 24),
                      Center(
                        child: TextButton.icon(
                          onPressed: () => context.pop(),
                          icon: const Icon(Icons.arrow_back_rounded, size: 18),
                          label: const Text('Kirish sahifasiga qaytish'),
                        ),
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
