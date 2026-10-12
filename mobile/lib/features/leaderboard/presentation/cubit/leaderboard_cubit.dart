import 'package:bloc/bloc.dart';
import 'package:equatable/equatable.dart';

import '../../domain/entities/leaderboard.dart';
import '../../domain/repositories/leaderboard_repository.dart';

part 'leaderboard_state.dart';

/// Reyting boshqaruvchisi — 3 ta tab uchun bitta cubit.
///
/// Har tab natijasi **alohida keshlanadi**: foydalanuvchi tablar orasida
/// almashganda qayta yuklanmaydi va ro'yxat "sakramaydi". Yangilash
/// faqat pull-to-refresh yoki birinchi ochilishda bo'ladi.
class LeaderboardCubit extends Cubit<LeaderboardState> {
  LeaderboardCubit(this._repository) : super(const LeaderboardState());

  final LeaderboardRepository _repository;

  /// Tab almashtirish. Ma'lumot hali yuklanmagan bo'lsa — yuklaydi.
  Future<void> selectTab(LeaderboardTab tab) async {
    if (state.tab == tab) return;
    emit(state.copyWith(tab: tab, clearError: true));
    if (state.pageFor(tab) == null) {
      await load(tab: tab);
    }
  }

  /// Ma'lumotni yuklaydi.
  ///
  /// [refresh] — pull-to-refresh: yuklanish indikatori ko'rsatilmaydi,
  /// eski ro'yxat ekranda qoladi (ekran "oq bo'lib ketmaydi").
  Future<void> load({LeaderboardTab? tab, bool refresh = false}) async {
    final target = tab ?? state.tab;

    if (!refresh) {
      emit(state.copyWith(status: LeaderboardStatus.loading, clearError: true));
    }

    final result = switch (target) {
      LeaderboardTab.overall => await _repository.getLeaderboard(
          period: LeaderboardPeriod.all,
        ),
      LeaderboardTab.monthly => await _repository.getLeaderboard(
          period: LeaderboardPeriod.monthly,
        ),
      LeaderboardTab.referrals => await _repository.getReferrals(
          period: LeaderboardPeriod.all,
        ),
    };

    if (isClosed) return;

    result.fold(
      (failure) => emit(state.copyWith(
        status: LeaderboardStatus.failure,
        errorMessage: failure.message,
      )),
      (page) {
        final pages = Map<LeaderboardTab, LeaderboardPage>.from(state.pages)
          ..[target] = page;
        emit(state.copyWith(
          status: LeaderboardStatus.success,
          pages: pages,
          clearError: true,
        ));
      },
    );
  }

  Future<void> refresh() => load(refresh: true);
}
