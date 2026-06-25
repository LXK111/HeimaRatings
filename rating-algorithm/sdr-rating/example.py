from sdr import Player, Match, SDRCalculator


def print_rankings(calculator, players, title="当前排名"):
    rankings = calculator.get_rankings(players)
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"{'排名':^6} | {'选手':^12} | {'积分':^8} | {'比赛':^6} | {'胜':^4} | {'负':^4} | {'平':^4}")
    print(f"{'-'*60}")
    for i, player in enumerate(rankings, 1):
        print(f"{i:^6} | {player.name:^12} | {player.rating:^8.1f} | {player.matches:^6} | {player.wins:^4} | {player.losses:^4} | {player.draws:^4}")
    print(f"{'='*60}")


if __name__ == "__main__":
    calculator = SDRCalculator(k_factor=32, score_weight=0.05)

    players = [
        Player("Zhang Wei"),
        Player("Li Ming"),
        Player("Wang Fang"),
        Player("Chen Yu"),
        Player("Liu Jie"),
        Player("Zhao Qiang"),
    ]

    print("\n=== HEMA比赛SDR评分系统演示 ===")
    print("初始状态 - 所有选手初始积分: 1500")
    print_rankings(calculator, players, "初始排名")

    matches = [
        Match(players[0], players[1], 15, 10),
        Match(players[2], players[3], 12, 8),
        Match(players[4], players[5], 18, 15),
        Match(players[0], players[2], 14, 14),
        Match(players[1], players[3], 16, 12),
        Match(players[4], players[0], 10, 15),
        Match(players[5], players[2], 9, 13),
        Match(players[1], players[4], 11, 11),
        Match(players[3], players[5], 17, 14),
        Match(players[0], players[5], 20, 8),
    ]

    for i, match in enumerate(matches, 1):
        print(f"\n--- 第 {i} 场比赛 ---")
        print(f"{match.player1.name} {match.score1} - {match.score2} {match.player2.name}")
        calculator.update_ratings(match)

    print_rankings(calculator, players, "最终排名")

    print("\n=== 算法特性说明 ===")
    print("1. SDR (Score Difference Rating) 在Elo基础上增加了比分差距因素")
    print("2. 大胜获得更多积分，惨败失去更多积分")
    print("3. k_factor: 32 (积分调整幅度)")
    print("4. score_weight: 0.05 (比分差距权重)")