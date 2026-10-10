import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/di/injector.dart';
import '../../../../core/router/app_routes.dart';
import '../../../../core/storage/prefs_store.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../shared/utils/validators.dart';
import '../../../../shared/widgets/app_widgets.dart';
import '../../../../shared/widgets/phone_field.dart';
import '../../../../shared/widgets/zakovat_logo.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/login_cubit.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => LoginCubit(sl()),
      child: const _LoginView(),
    );
  }
}

class _LoginView extends StatefulWidget {
  const _LoginView();

  @override
  State<_LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<_LoginView> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _passwordFocus = FocusNode();

  @override
  void initState() {
    super.initState();
    // Oxirgi kiritilgan raqamni oldindan to'ldiramiz — qayta kirish tezroq.
    final last = sl<PrefsStore>().lastPhone;
    if (last != null && last.isNotEmpty) {
      _phoneController.text = _maskFromE164(last);
    }
  }

  static String _maskFromE164(String e164) {
    final digits = Validators.nationalDigits(e164);
    if (digits.length < 9) return digits;
    return '${digits.substring(0, 2)} ${digits.substring(2, 5)} '
        '${digits.substring(5, 7)} ${digits.substring(7, 9)}';
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  void _submit() {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;

    context.read<LoginCubit>().submit(
          phone: Validators.normalizePhone(_phoneController.text),
          password: _passwordController.text,
        );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return BlocListener<LoginCubit, LoginState>(
      listenWhen: (prev, curr) => prev.status != curr.status,
      listener: (context, state) {
        if (state.status == FormStatus.success && state.session != null) {
          // Sessiyani global bloc'ga beramiz — router avtomatik home'ga o'tadi.
          context.read<AuthBloc>().add(AuthSessionGranted(state.session!));
        }
      },
      child: Scaffold(
        body: SafeArea(
          child: GestureDetector(
            onTap: () => FocusScope.of(context).unfocus(),
            behavior: HitTestBehavior.opaque,
            child: CustomScrollView(
              keyboardDismissBehavior:
                  ScrollViewKeyboardDismissBehavior.onDrag,
              slivers: [
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const SizedBox(height: 32),
                          Center(
                            child: Column(
                              children: [
                                const ZakovatLogo(size: 64),
                                const SizedBox(height: 16),
                                const ZakovatWordmark(fontSize: 22),
                              ],
                            ),
                          ).animate().fadeIn(duration: 400.ms).moveY(begin: -10),

                          const SizedBox(height: 40),
                          Text(
                            'Xush kelibsiz!',
                            style: theme.textTheme.headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w900),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Davom etish uchun hisobingizga kiring',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: theme.colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(height: 28),

                          BlocBuilder<LoginCubit, LoginState>(
                            builder: (context, state) {
                              return Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  if (state.errorMessage != null) ...[
                                    ErrorBanner(
                                      message: state.errorMessage!,
                                      onDismiss: () =>
                                          context.read<LoginCubit>().clearError(),
                                    ).animate().fadeIn().shake(hz: 3, offset: const Offset(3, 0)),
                                    const SizedBox(height: 18),
                                  ],
                                  PhoneField(
                                    controller: _phoneController,
                                    enabled: !state.isSubmitting,
                                    errorText: state.fieldErrors['phone'],
                                    onSubmitted: (_) =>
                                        _passwordFocus.requestFocus(),
                                  ),
                                  const SizedBox(height: 14),
                                  TextFormField(
                                    controller: _passwordController,
                                    focusNode: _passwordFocus,
                                    enabled: !state.isSubmitting,
                                    obscureText: state.obscurePassword,
                                    textInputAction: TextInputAction.done,
                                    autofillHints: const [AutofillHints.password],
                                    onFieldSubmitted: (_) => _submit(),
                                    validator: (v) => (v ?? '').isEmpty
                                        ? 'Parolni kiriting'
                                        : null,
                                    decoration: InputDecoration(
                                      labelText: 'Parol',
                                      errorText: state.fieldErrors['password'],
                                      prefixIcon:
                                          const Icon(Icons.lock_outline_rounded),
                                      suffixIcon: IconButton(
                                        onPressed: context
                                            .read<LoginCubit>()
                                            .togglePasswordVisibility,
                                        icon: Icon(
                                          state.obscurePassword
                                              ? Icons.visibility_outlined
                                              : Icons.visibility_off_outlined,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton(
                                      onPressed: state.isSubmitting
                                          ? null
                                          : () => context.push(AppRoutes.forgotPassword),
                                      child: const Text('Parolni unutdingizmi?'),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  LoadingButton(
                                    label: 'Kirish',
                                    isLoading: state.isSubmitting,
                                    onPressed: _submit,
                                  ),
                                ],
                              );
                            },
                          ),

                          const Spacer(),
                          const SizedBox(height: 24),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                'Hisobingiz yo\'qmi? ',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: theme.colorScheme.onSurfaceVariant,
                                ),
                              ),
                              GestureDetector(
                                onTap: () => context.push(AppRoutes.register),
                                child: const Text(
                                  'Ro\'yxatdan o\'tish',
                                  style: TextStyle(
                                    color: AppColors.gold,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 20),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
