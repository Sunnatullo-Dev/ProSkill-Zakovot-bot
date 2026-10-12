import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

import '../../../../core/network/api_paths.dart';
import '../models/profile_models.dart';

part 'profile_remote_data_source.g.dart';

@RestApi()
abstract class ProfileRemoteDataSource {
  factory ProfileRemoteDataSource(Dio dio, {String? baseUrl}) =
      _ProfileRemoteDataSource;

  @GET(ApiPaths.gameStats)
  Future<StatsResponseModel> getStats();
}
