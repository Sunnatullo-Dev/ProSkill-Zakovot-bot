import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

import '../../../../core/network/api_paths.dart';
import '../models/daily_models.dart';

part 'daily_remote_data_source.g.dart';

@RestApi()
abstract class DailyRemoteDataSource {
  factory DailyRemoteDataSource(Dio dio, {String? baseUrl}) =
      _DailyRemoteDataSource;

  @GET(ApiPaths.dailyToday)
  Future<DailyTodayModel> getToday();

  @POST(ApiPaths.dailyComplete)
  Future<DailyCompleteModel> complete();
}
