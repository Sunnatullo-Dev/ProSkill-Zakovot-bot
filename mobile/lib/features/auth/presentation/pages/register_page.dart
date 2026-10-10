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
import '../bloc/auth_bloc.dart';
import '../bloc/login_cubit.dart' show FormStatus;
import '../bloc/register_cubit.dart';

class RegisterPage extends StatelessWidget {
  const RegisterPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => RegisterCubit(
        sl(),
        startTelegramRegister: sl(),
        verifyTelegramRegister: sl(),
        resendOtp: sl(),
      ),
      child: const _RegisterView(),
    );
  }
}

class _RegisterView extends StatefulWidget {
  const _RegisterView();

  @override
  State<_RegisterView> createState() => _RegisterViewState();
}

class _RegisterViewState extends State<_RegisterView> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();

  final _phoneFocus = FocusNode();
  final _passwordFocus = FocusNode();
  final _confirmFocus = FocusNode();

  double _strength = 0;

  @override
  void initState() {
    super.initState();
    _passwordController.addListener(() {
      final next = Validators.passwordStrength(_passwordController.text);
      if (next != _strength) setState(() => _strength = next);
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    _phoneFocus.dispose();
    _passwordFocus.dispose();
    _confirmFocus.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    FocusScope.of(context).unfocus();
    if (!(_formKey.currentState?.validate() ?? false)) return;

    final cubit = context.read<RegisterCubit>();
    if (!cubit.state.acceptedTerms) {
      context.showSnack('Shartlarni qabul qiling', isError: true);
      return;
    }

    final success = await cubit.startRegistration(
      phone: Validators.normalizePhone(_phoneController.text),
      password: _passwordController.text,
      firstName: _nameController.text.trim(),
      language: sl<PrefsStore>().language,
    );

    if (success && mounted) {
      final challenge = cubit.state.challenge;
      if (challenge != null) {
        context.push(
          AppRoutes.registerVerify,
          extra: {
            'challenge': challenge,
            'cubit': cubit,
          },
        );
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

    return BlocListener<RegisterCubit, RegisterState>(
      listenWhen: (prev, curr) => prev.status != curr.status,
      listener: (context, state) {
        if (state.status == FormStatus.success && state.session != null) {
          context.read<AuthBloc>().add(AuthSessionGranted(state.session!));
        }
      },
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 20),
            onPressed: () => context.pop(),
          ),
          title: const Text('Ro\'yxatdan o\'tish'),
        ),
        body: SafeArea(
          child: GestureDetector(
            onTap: () => FocusScope.of(context).unfocus(),
            behavior: HitTestBehavior.opaque,
            child: BlocBuilder<RegisterCubit, RegisterState>(
              builder: (context, state) {
                return ListView(
                  padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
                  keyboardDismissBehavior:
                      ScrollViewKeyboardDismissBehavior.onDrag,
                  children: [
                    Text(
                      'Yangi hisob yarating',
                      style: theme.textTheme.headlineSmall
                          ?.copyWith(fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Ballaringiz va yutuqlaringiz saqlanib qoladi',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 26),

                    if (state.errorMessage != null) ...[
                      ErrorBanner(
                        message: state.errorMessage!,
                        onDismiss: () =>
                            context.read<RegisterCubit>().clearError(),
                      ).animate().fadeIn().shake(hz: 3, offset: const Offset(3, 0)),
                      const SizedBox(height: 18),
                    ],

                    TextFormField(
                      controller: _nameController,
                      enabled: !state.isSubmitting,
                      textInputAction: TextInputAction.next,
                      textCapitalization: TextCapitalization.words,
                      autofillHints: const [AutofillHints.givenName],
                      validator: (v) => Validators.name(v),
                      onFieldSubmitted: (_) => _phoneFocus.requestFocus(),
                      decoration: InputDecoration(
                        labelText: 'Ismingiz',
                        hintText: 'Masalan: Amirxon',
                        errorText: state.fieldErrors['firstName'],
                        prefixIcon: const Icon(Icons.person_outline_rounded),
                      ),
                    ),
                    const SizedBox(height: 14),

                    Focus(
                      focusNode: _phoneFocus,
                      child: PhoneField(
                        controller: _phoneController,
                        enabled: !state.isSubmitting,
                        errorText: state.fieldErrors['phone'],
                        onSubmitted: (_) => _passwordFocus.requestFocus(),
                      ),
                    ),
                    const SizedBox(height: 14),

                    TextFormField(
                      controller: _passwordController,
                      focusNode: _passwordFocus,
                      enabled: !state.isSubmitting,
                      obscureText: state.obscurePassword,
                      textInputAction: TextInputAction.next,
                      autofillHints: const [AutofillHints.newPassword],
                      validator: Validators.password,
                      onFieldSubmitted: (_) => _confirmFocus.requestFocus(),
                      decoration: InputDecoration(
                        labelText: 'Parol',
                        helperText: 'Kamida 8 belgi, harf va raqam',
                        errorText: state.fieldErrors['password'],
                        prefixIcon: const Icon(Icons.lock_outline_rounded),
                        suffixIcon: IconButton(
                          onPressed: context
                              .read<RegisterCubit>()
                              .togglePasswordVisibility,
                          icon: Icon(
                            state.obscurePassword
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                    ),

                    if (_passwordController.text.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Expanded(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: _strength,
                                minHeight: 5,
                                backgroundColor: theme.colorScheme.outline,
                                valueColor:
                                    AlwaysStoppedAnimation(_strengthColor),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Text(
                            Validators.passwordStrengthLabel(_strength),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: _strengthColor,
                            ),
                          ),
                        ],
                      ),
                    ],

                    const SizedBox(height: 14),
                    TextFormField(
                      controller: _confirmController,
                      focusNode: _confirmFocus,
                      enabled: !state.isSubmitting,
                      obscureText: state.obscurePassword,
                      textInputAction: TextInputAction.done,
                      validator: (v) => Validators.confirmPassword(
                        v,
                        _passwordController.text,
                      ),
                      onFieldSubmitted: (_) => _submit(),
                      decoration: const InputDecoration(
                        labelText: 'Parolni takrorlang',
                        prefixIcon: Icon(Icons.lock_reset_rounded),
                      ),
                    ),

                    const SizedBox(height: 18),
                    InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: state.isSubmitting
                          ? null
                          : () => context
                              .read<RegisterCubit>()
                              .setAcceptedTerms(!state.acceptedTerms),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Checkbox(
                              value: state.acceptedTerms,
                              onChanged: state.isSubmitting
                                  ? null
                                  : (v) => context
                                      .read<RegisterCubit>()
                                      .setAcceptedTerms(v ?? false),
                            ),
                            Expanded(
                              child: Padding(
                                padding: const EdgeInsets.only(top: 12),
                                child: Text(
                                  'Foydalanish shartlari va maxfiylik siyosatiga roziman',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: theme.colorScheme.onSurfaceVariant,
                                    height: 1.4,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 20),
                    LoadingButton(
                      label: 'Ro\'yxatdan o\'tish',
                      isLoading: state.isSubmitting,
                      onPressed: _submit,
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: TextButton(
                        onPressed:
                            state.isSubmitting ? null : () => context.pop(),
                        child: const Text('Hisobim bor — kirish'),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
