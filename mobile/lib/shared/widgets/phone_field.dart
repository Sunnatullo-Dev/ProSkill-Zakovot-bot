import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../utils/validators.dart';

/// `+998` prefiksi qat'iy, foydalanuvchi faqat 9 raqam kiritadi.
///
/// Maska: `90 123 45 67` — kiritish jarayonida avtomatik bo'shliq qo'yiladi.
/// Bu O'zbekistonda odatiy ko'rinish, foydalanuvchi raqamini shu shaklda
/// eslaydi va xato kiritish ehtimoli kamayadi.
class PhoneField extends StatelessWidget {
  const PhoneField({
    super.key,
    required this.controller,
    this.enabled = true,
    this.autofocus = false,
    this.errorText,
    this.onSubmitted,
    this.textInputAction = TextInputAction.next,
  });

  final TextEditingController controller;
  final bool enabled;
  final bool autofocus;
  final String? errorText;
  final ValueChanged<String>? onSubmitted;
  final TextInputAction textInputAction;

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      enabled: enabled,
      autofocus: autofocus,
      keyboardType: TextInputType.phone,
      textInputAction: textInputAction,
      autofillHints: const [AutofillHints.telephoneNumberNational],
      inputFormatters: [
        FilteringTextInputFormatter.digitsOnly,
        _UzPhoneMaskFormatter(),
      ],
      validator: Validators.phone,
      onFieldSubmitted: onSubmitted,
      style: const TextStyle(
        fontSize: 17,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.5,
      ),
      decoration: InputDecoration(
        labelText: 'Telefon raqami',
        hintText: '90 123 45 67',
        errorText: errorText,
        prefixIcon: const Padding(
          padding: EdgeInsets.only(left: 16, right: 8),
          child: Text(
            '🇺🇿  +998',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              height: 1.2,
            ),
          ),
        ),
        prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
      ),
    );
  }
}

/// `901234567` → `90 123 45 67`
class _UzPhoneMaskFormatter extends TextInputFormatter {
  static const _groups = [2, 3, 2, 2]; // 90 | 123 | 45 | 67

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    final digits = Validators.nationalDigits(newValue.text);

    final buffer = StringBuffer();
    var index = 0;
    for (final size in _groups) {
      if (index >= digits.length) break;
      if (buffer.isNotEmpty) buffer.write(' ');
      final end = (index + size).clamp(0, digits.length);
      buffer.write(digits.substring(index, end));
      index = end;
    }

    final formatted = buffer.toString();
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: formatted.length),
    );
  }
}
