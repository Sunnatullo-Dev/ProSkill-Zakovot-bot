import 'package:flutter_test/flutter_test.dart';
import 'package:zakovat/shared/utils/validators.dart';

/// Kliyent validatsiyasi backend qoidalari bilan mos kelishini tekshiradi.
///
/// Backend manba: `backend-django/apps/auth_api/credentials.py`
void main() {
  group('normalizePhone', () {
    test('turli formatlarni bir xil E.164 ga keltiradi', () {
      const expected = '+998901234567';
      for (final raw in [
        '+998901234567',
        '998901234567',
        '901234567',
        '0901234567',
        '+998 90 123 45 67',
        '90 123 45 67',
        '(90) 123-45-67',
      ]) {
        expect(Validators.normalizePhone(raw), expected, reason: raw);
      }
    });

    test('bo\'sh qiymatda bo\'sh string qaytaradi', () {
      expect(Validators.normalizePhone(''), '');
      expect(Validators.normalizePhone('   '), '');
    });
  });

  group('nationalDigits', () {
    test('998 prefiksini olib tashlaydi', () {
      expect(Validators.nationalDigits('+998901234567'), '901234567');
    });

    test('9 ta raqamdan ortig\'ini kesadi', () {
      expect(Validators.nationalDigits('9012345678888'), '901234567');
    });
  });

  group('phone validator', () {
    test('to\'liq raqamni qabul qiladi', () {
      expect(Validators.phone('90 123 45 67'), isNull);
    });

    test('chala raqamni rad etadi', () {
      expect(Validators.phone('90 123'), isNotNull);
    });

    test('bo\'sh qiymatni rad etadi', () {
      expect(Validators.phone(''), isNotNull);
      expect(Validators.phone(null), isNotNull);
    });
  });

  group('password validator', () {
    test('to\'g\'ri parolni qabul qiladi', () {
      expect(Validators.password('zakovat2026'), isNull);
    });

    test('backend rad etadigan parollarni rad etadi', () {
      // Bu ro'yxat credentials.validate_password bilan bir xil bo'lishi shart
      for (final bad in ['short1', 'alllettersonly', '12345678', '        ']) {
        expect(Validators.password(bad), isNotNull, reason: bad);
      }
    });

    test('juda uzun parolni rad etadi', () {
      expect(Validators.password('a1${'x' * 200}'), isNotNull);
    });
  });

  group('confirmPassword', () {
    test('mos kelsa null', () {
      expect(Validators.confirmPassword('abc12345', 'abc12345'), isNull);
    });

    test('mos kelmasa xato', () {
      expect(Validators.confirmPassword('abc12345', 'xyz12345'), isNotNull);
    });
  });

  group('name validator', () {
    test('normal ismni qabul qiladi', () {
      expect(Validators.name('Amirxon'), isNull);
    });

    test('juda qisqa yoki uzun ismni rad etadi', () {
      expect(Validators.name('A'), isNotNull);
      expect(Validators.name('x' * 31), isNotNull);
    });
  });

  group('passwordStrength', () {
    test('bo\'sh parol — 0', () {
      expect(Validators.passwordStrength(''), 0);
    });

    test('kuchli parol zaifidan yuqori baholanadi', () {
      final weak = Validators.passwordStrength('abc12345');
      final strong = Validators.passwordStrength('Abcdef123456!');
      expect(strong, greaterThan(weak));
      expect(strong, lessThanOrEqualTo(1.0));
    });
  });
}
