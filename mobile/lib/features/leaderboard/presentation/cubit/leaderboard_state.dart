part of 'leaderboard_cubit.dart';

enum LeaderboardTab {
  overall('Umumiy', '🏆'),
  monthly('Shu oy', '📅'),
  referrals('Takliflar', '🤝');

  const LeaderboardTab(this.label, this.emoji);

  final String label;
  final String emoji;
}

enum LeaderboardStatus { initial, loading, success, failure }

class LeaderboardState extends Equatable {
  const LeaderboardState({
    this.tab = LeaderboardTab.overall,
    this.status = LeaderboardStatus.initial,
    this.pages = const {},
    this.errorMessage,
  });

  final LeaderboardTab tab;
  final LeaderboardStatus status;

  /// Har tab uchun alohida kesh.
  final Map<LeaderboardTab, LeaderboardPage> pages;

  final String? errorMessage;

  LeaderboardPage? pageFor(LeaderboardTab t) => pages[t];
  LeaderboardPage? get currentPage => pages[tab];

  bool get isLoading => status == LeaderboardStatus.loading;
  bool get hasData => currentPage != null;

  /// Taklif tabida "ball" emas, "kishi" birligi ishlatiladi.
  String get unitLabel => tab == LeaderboardTab.referrals ? 'kishi' : 'ball';

  LeaderboardState copyWith({
    LeaderboardTab? tab,
    LeaderboardStatus? status,
    Map<LeaderboardTab, LeaderboardPage>? pages,
    String? errorMessage,
    bool clearError = false,
  }) {
    return LeaderboardState(
      tab: tab ?? this.tab,
      status: status ?? this.status,
      pages: pages ?? this.pages,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }

  @override
  List<Object?> get props => [tab, status, pages, errorMessage];
}
