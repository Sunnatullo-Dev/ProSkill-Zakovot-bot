import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

import '../../../../core/network/api_paths.dart';
import '../models/auth_response_model.dart';

part 'auth_remote_data_source.g.dart';

/// Auth endpointlari uchun Retrofit mijozi.
///
/// Retrofit `Dio` ustida ishlaydi — barcha interceptorlar (auth, xato, log)
/// avtomatik qo'llanadi.
@RestApi()
abstract class AuthRemoteDataSource {
  factory AuthRemoteDataSource(Dio dio, {String? baseUrl}) =
      _AuthRemoteDataSource;

  @POST(ApiPaths.register)
  Future<AuthResponseModel> register(@Body() Map<String, dynamic> body);

  @POST(ApiPaths.loginPassword)
  Future<AuthResponseModel> login(@Body() Map<String, dynamic> body);

  @GET(ApiPaths.me)
  Future<MeResponseModel> me();

  @POST(ApiPaths.logout)
  Future<void> logout(@Body() Map<String, dynamic> body);

  @POST(ApiPaths.logoutAll)
  Future<void> logoutAll();

  @PATCH(ApiPaths.changePassword)
  Future<AuthResponseModel> changePassword(@Body() Map<String, dynamic> body);

  @PATCH(ApiPaths.updateMe)
  Future<UpdateUserResponseModel> updateMe(@Body() Map<String, dynamic> body);

  @PATCH(ApiPaths.updateLanguage)
  Future<void> updateLanguage(@Body() Map<String, dynamic> body);

  @POST(ApiPaths.telegramOtpRegisterStart)
  Future<Map<String, dynamic>> startTelegramRegister(@Body() Map<String, dynamic> body);

  @POST(ApiPaths.telegramOtpRegisterVerify)
  Future<AuthResponseModel> verifyTelegramRegister(@Body() Map<String, dynamic> body);

  @POST(ApiPaths.telegramOtpForgotPassword)
  Future<Map<String, dynamic>> forgotPassword(@Body() Map<String, dynamic> body);

  @POST(ApiPaths.telegramOtpResetPassword)
  Future<AuthResponseModel> resetPassword(@Body() Map<String, dynamic> body);

  @POST(ApiPaths.telegramOtpResend)
  Future<Map<String, dynamic>> resendTelegramOtp(@Body() Map<String, dynamic> body);
}
