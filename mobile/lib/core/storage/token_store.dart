import 'dart:async';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// JWT tokenlarni **shifrlangan** xotirada saqlaydi.
///
/// Android — EncryptedSharedPreferences (Keystore), iOS — Keychain.
/// Simulyator yoki Keychain ruxsati bo'lmaganda SharedPreferences zaxirasi ishlatiladi.
class TokenStore {
  TokenStore(this._storage, this._prefs);

  final FlutterSecureStorage _storage;
  final SharedPreferences _prefs;

  static const _kAccess = 'zakovat.access_token';
  static const _kRefresh = 'zakovat.refresh_token';
  static const _kExpiresAt = 'zakovat.access_expires_at';

  String? _accessCache;
  String? _refreshCache;
  DateTime? _expiresAtCache;
  bool _loaded = false;

  /// Ilova ishga tushganda bir marta chaqiriladi.
  Future<void> load() async {
    if (_loaded) return;
    try {
      final results = await Future.wait([
        _storage.read(key: _kAccess),
        _storage.read(key: _kRefresh),
        _storage.read(key: _kExpiresAt),
      ]);
      _accessCache = results[0] ?? _prefs.getString(_kAccess);
      _refreshCache = results[1] ?? _prefs.getString(_kRefresh);
      final rawExpiry = results[2] ?? _prefs.getString(_kExpiresAt);
      _expiresAtCache = rawExpiry == null
          ? null
          : DateTime.tryParse(rawExpiry);
    } catch (_) {
      _accessCache = _prefs.getString(_kAccess);
      _refreshCache = _prefs.getString(_kRefresh);
      final rawExpiry = _prefs.getString(_kExpiresAt);
      _expiresAtCache = rawExpiry == null
          ? null
          : DateTime.tryParse(rawExpiry);
    }
    _loaded = true;
  }

  String? get accessToken => _accessCache;
  String? get refreshToken => _refreshCache;
  DateTime? get accessExpiresAt => _expiresAtCache;

  bool get hasSession => (_refreshCache?.isNotEmpty ?? false);

  bool isAccessExpired({Duration leeway = const Duration(seconds: 30)}) {
    final exp = _expiresAtCache;
    if (exp == null) return _accessCache == null;
    return DateTime.now().add(leeway).isAfter(exp);
  }

  Future<void> save({
    required String accessToken,
    required String refreshToken,
    required int accessExpiresInSeconds,
  }) async {
    final expiresAt = DateTime.now().add(Duration(seconds: accessExpiresInSeconds));

    _accessCache = accessToken;
    _refreshCache = refreshToken;
    _expiresAtCache = expiresAt;
    _loaded = true;

    try {
      await Future.wait([
        _storage.write(key: _kAccess, value: accessToken),
        _storage.write(key: _kRefresh, value: refreshToken),
        _storage.write(key: _kExpiresAt, value: expiresAt.toIso8601String()),
      ]);
    } catch (_) {
      await Future.wait([
        _prefs.setString(_kAccess, accessToken),
        _prefs.setString(_kRefresh, refreshToken),
        _prefs.setString(_kExpiresAt, expiresAt.toIso8601String()),
      ]);
    }
  }

  Future<void> clear() async {
    _accessCache = null;
    _refreshCache = null;
    _expiresAtCache = null;
    _loaded = true;
    try {
      await Future.wait([
        _storage.delete(key: _kAccess),
        _storage.delete(key: _kRefresh),
        _storage.delete(key: _kExpiresAt),
      ]);
    } catch (_) {}
    await Future.wait([
      _prefs.remove(_kAccess),
      _prefs.remove(_kRefresh),
      _prefs.remove(_kExpiresAt),
    ]);
  }
}
