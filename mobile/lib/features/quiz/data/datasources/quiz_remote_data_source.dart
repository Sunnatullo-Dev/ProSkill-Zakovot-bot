import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';

import '../../../../core/network/api_paths.dart';
import '../models/quiz_models.dart';

part 'quiz_remote_data_source.g.dart';

/// Yakka o'yin endpointlari.
@RestApi()
abstract class QuizRemoteDataSource {
  factory QuizRemoteDataSource(Dio dio, {String? baseUrl}) =
      _QuizRemoteDataSource;

  @GET(ApiPaths.questionsRound)
  Future<RoundResponseModel> getRound({
    @Query('count') int count = 10,
    @Query('category') String? category,
    @Query('difficulty') String? difficulty,
  });

  @POST(ApiPaths.answerTicket)
  Future<TicketResponseModel> issueTicket(@Body() Map<String, dynamic> body);

  @POST(ApiPaths.submitAnswer)
  Future<AnswerResultModel> submitAnswer(@Body() Map<String, dynamic> body);

  @POST(ApiPaths.revealAnswer)
  Future<RevealResponseModel> reveal(@Body() Map<String, dynamic> body);

  @POST(ApiPaths.gameResults)
  Future<void> saveResult(@Body() Map<String, dynamic> body);

  @POST(ApiPaths.checkAchievements)
  Future<AchievementsResponseModel> checkAchievements();
}
