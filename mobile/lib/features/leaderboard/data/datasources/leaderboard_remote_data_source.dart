import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

import '../../../../core/network/api_paths.dart';
import '../models/leaderboard_models.dart';

part 'leaderboard_remote_data_source.g.dart';

@RestApi()
abstract class LeaderboardRemoteDataSource {
  factory LeaderboardRemoteDataSource(Dio dio, {String? baseUrl}) =
      _LeaderboardRemoteDataSource;

  @GET(ApiPaths.leaderboard)
  Future<LeaderboardResponseModel> getLeaderboard({
    @Query('period') String period = 'all',
    @Query('limit') int limit = 20,
  });

  @GET(ApiPaths.referrals)
  Future<ReferralsResponseModel> getReferrals({
    @Query('period') String period = 'all',
  });
}
