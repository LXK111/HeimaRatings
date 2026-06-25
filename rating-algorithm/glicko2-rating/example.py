from glicko2 import Player, Glicko2Calculator


def print_rankings(calculator, players, title="当前排名"):
    rankings = calculator.get_rankings(players)
    print(f"\n{'='*70}")
    print(f"{title}")
    print(f"{'='*70}")
    print(f"{'排名':^6} | {'选手':^12} | {'积分':^8} | {'RD':^6} | {'σ':^6} | {'比赛':^6} | {'胜':^4} | {'负':^4}")
    print(f"{'-'*70}")
    for i, player in enumerate(rankings, 1):
        print(f"{i:^6} | {player.name:^12} | {player.rating:^8.1f} | {player.rd:^6.1f} | {player.sigma:^6.4f} | {player.matches:^6} | {player.wins:^4} | {player.losses:^4}")
    print(f"{'='*70}")


if __name__ == "__main__":
    calculator = Glicko2Calculator(tau=0.5)

    players = [
        Player("Zhang Wei"),
        Player("Li Ming"),
        Player("Wang Fang"),
        Player("Chen Yu"),
        Player("Liu Jie"),
        Player("Zhao Qiang"),
    ]

    print("\n=== HEMA比赛Glicko-2评分系统演示 ===")
    print("初始状态 - 所有选手初始积分: 1500, RD: 350, σ: 0.06")
    print_rankings(calculator, players, "初始排名")

    match_groups = [
        [(players[0], players[1], 1)],
        [(players[2], players[3], 1)],
        [(players[4], players[5], 1)],
        [(players[0], players[2], 0.5)],
        [(players[1], players[3], 1)],
        [(players[4], players[0], 0)],
        [(players[5], players[2], 0)],
        [(players[1], players[4], 0.5)],
        [(players[3], players[5], 1)],
        [(players[0], players[5], 1)],
    ]

    for period, matches in enumerate(match_groups, 1):
        print(f"\n--- 第 {period} 个评分周期 ---")
        
        player_opponents = {}
        for p1, p2, result in matches:
            print(f"{p1.name} vs {p2.name} -> {'胜' if result == 1 else '平' if result == 0.5 else '负'}")
            
            if p1 not in player_opponents:
                player_opponents[p1] = []
            player_opponents[p1].append((p2, result))
            
            if p2 not in player_opponents:
                player_opponents[p2] = []
            player_opponents[p2].append((p1, 1 - result))
            
            p1.update_record(result)
            p2.update_record(1 - result)
        
        for player in players:
            opponents = player_opponents.get(player, [])
            calculator.update_player(player, opponents)

    print_rankings(calculator, players, "最终排名")

    print("\n=== Glicko-2算法特性说明 ===")
    print("1. 三参数评分系统: 评分(Rating)、评分偏差(RD)、波动性(σ)")
    print("2. RD (Rating Deviation): 评分不确定性，值越小越可靠")
    print("3. σ (Sigma): 评分波动性，衡量评分变化的预期幅度")
    print("4. τ (Tau): 系统常数，控制σ的变化幅度(推荐值: 0.3-1.2)")
    print("5. 长时间未比赛的选手，RD会增大，评分可信度下降")