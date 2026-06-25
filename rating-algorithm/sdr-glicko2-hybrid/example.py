from sdr_glicko2 import Player, Match, SDRGlicko2Calculator


def print_rankings(calculator, players, title="当前排名"):
    rankings = calculator.get_rankings(players)
    print(f"\n{'='*80}")
    print(f"{title}")
    print(f"{'='*80}")
    print(f"{'排名':^6} | {'选手':^12} | {'积分':^8} | {'RD':^6} | {'σ':^6} | {'比赛':^6} | {'胜':^4} | {'负':^4} | {'净胜分':^8}")
    print(f"{'-'*80}")
    for i, player in enumerate(rankings, 1):
        net_score = sum(m[2] - m[3] for m in getattr(player, '_match_details', [])) if hasattr(player, '_match_details') else 0
        print(f"{i:^6} | {player.name:^12} | {player.rating:^8.1f} | {player.rd:^6.1f} | {player.sigma:^6.4f} | {player.matches:^6} | {player.wins:^4} | {player.losses:^4} | {net_score:^8}")
    print(f"{'='*80}")


if __name__ == "__main__":
    calculator = SDRGlicko2Calculator(tau=0.5, score_weight=0.05)

    players = [
        Player("Zhang Wei", rating=1600, rd=100),
        Player("Li Ming", rating=1550, rd=100),
        Player("Wang Fang", rating=1500, rd=150),
        Player("Chen Yu", rating=1450, rd=150),
        Player("Liu Jie", rating=1400, rd=200),
        Player("Zhao Qiang", rating=1350, rd=200),
    ]

    print("\n=== SDR-Glicko2 融合算法演示 ===")
    print("结合了SDR的比分敏感性和Glicko-2的评分不确定性管理")
    print_rankings(calculator, players, "初始排名")

    matches = [
        Match(players[0], players[1], 15, 10),
        Match(players[2], players[3], 12, 8),
        Match(players[4], players[5], 18, 15),
        Match(players[0], players[2], 14, 14),
        Match(players[1], players[3], 16, 12),
        Match(players[4], players[0], 10, 20),
        Match(players[5], players[2], 9, 13),
        Match(players[1], players[4], 11, 11),
        Match(players[3], players[5], 17, 5),
        Match(players[0], players[5], 25, 5),
    ]

    for i, match in enumerate(matches, 1):
        print(f"\n--- 第 {i} 场比赛 ---")
        print(f"{match.player1.name} {match.score1} - {match.score2} {match.player2.name}")
        if match.score_diff >= 10:
            print(f"   🏆 大比分差距 ({match.score_diff}分)")
        calculator.process_match(match)

    print_rankings(calculator, players, "最终排名")

    print("\n=== 融合算法特性说明 ===")
    print("📊 融合了两种算法的优点:")
    print("   • SDR特性: 比分差距会影响评分变化")
    print("   • Glicko-2特性: 三参数系统(Rating/RD/σ)")
    print("   • RD越小表示评分越可靠")
    print("   • 长时间未比赛的选手RD会增大")
    print("\n⚙️ 参数说明:")
    print("   • tau=0.5: 控制σ的变化幅度")
    print("   • score_weight=0.05: 比分差距的权重")
    print("\n🔍 结果分析:")
    print("   • Zhang Wei (大胜多次) → 积分上升明显")
    print("   • Zhao Qiang (多次惨败) → 积分下降明显")
    print("   • Wang Fang vs Zhang Wei (平局) → 积分变化小")