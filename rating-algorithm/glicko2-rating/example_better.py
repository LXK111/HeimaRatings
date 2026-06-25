from glicko2 import Player, Glicko2Calculator


def print_rankings(calculator, players, title="当前排名"):
    rankings = calculator.get_rankings(players)
    print(f"\n{'='*70}")
    print(f"{title}")
    print(f"{'='*70}")
    print(f"{'排名':^6} | {'选手':^12} | {'积分':^8} | {'RD':^6} | {'σ':^6} | {'比赛':^6} | {'胜率':^6}")
    print(f"{'-'*70}")
    for i, player in enumerate(rankings, 1):
        win_rate = (player.wins / player.matches * 100) if player.matches > 0 else 0
        print(f"{i:^6} | {player.name:^12} | {player.rating:^8.1f} | {player.rd:^6.1f} | {player.sigma:^6.4f} | {player.matches:^6} | {win_rate:^5.1f}%")
    print(f"{'='*70}")


if __name__ == "__main__":
    calculator = Glicko2Calculator(tau=0.5)

    players = {
        "Zhang Wei": Player("Zhang Wei", rating=1600, rd=100),
        "Li Ming": Player("Li Ming", rating=1550, rd=100),
        "Wang Fang": Player("Wang Fang", rating=1500, rd=150),
        "Chen Yu": Player("Chen Yu", rating=1450, rd=150),
        "Liu Jie": Player("Liu Jie", rating=1400, rd=200),
        "Zhao Qiang": Player("Zhao Qiang", rating=1350, rd=200),
    }

    print("\n=== HEMA比赛Glicko-2评分系统演示 ===")
    print("初始状态 - 选手有不同的初始积分和评分偏差")
    print_rankings(calculator, players.values(), "初始排名")

    periods = [
        [("Zhang Wei", "Li Ming", 1), ("Wang Fang", "Chen Yu", 1), ("Liu Jie", "Zhao Qiang", 0.5)],
        [("Zhang Wei", "Wang Fang", 1), ("Li Ming", "Chen Yu", 1), ("Zhang Wei", "Liu Jie", 1)],
        [("Li Ming", "Wang Fang", 0.5), ("Chen Yu", "Zhao Qiang", 1), ("Zhang Wei", "Chen Yu", 1)],
        [("Wang Fang", "Liu Jie", 1), ("Li Ming", "Zhao Qiang", 1), ("Zhang Wei", "Zhao Qiang", 1)],
        [("Li Ming", "Liu Jie", 1), ("Wang Fang", "Zhao Qiang", 1), ("Chen Yu", "Liu Jie", 0.5)],
    ]

    for period_idx, period_matches in enumerate(periods, 1):
        print(f"\n--- 第 {period_idx} 评分周期 ---")
        
        player_opponents = {name: [] for name in players}
        
        for p1_name, p2_name, result in period_matches:
            p1 = players[p1_name]
            p2 = players[p2_name]
            print(f"  {p1_name} vs {p2_name} -> {'胜' if result == 1 else '平' if result == 0.5 else '负'}")
            
            player_opponents[p1_name].append((p2, result))
            player_opponents[p2_name].append((p1, 1 - result))
            
            p1.update_record(result)
            p2.update_record(1 - result)
        
        for name in players:
            player = players[name]
            opponents = player_opponents[name]
            calculator.update_player(player, opponents)
        
        if period_idx % 2 == 0:
            print_rankings(calculator, players.values(), f"第 {period_idx} 周期后排名")

    print_rankings(calculator, players.values(), "最终排名")

    print("\n=== Glicko-2算法特性说明 ===")
    print("1. 三参数评分系统: 评分(Rating)、评分偏差(RD)、波动性(σ)")
    print("2. RD越小表示评分越可靠，随着比赛增加RD会逐渐减小")
    print("3. 高水平选手击败低水平选手，评分变化较小")
    print("4. 冷门爆冷会导致更大的评分变化")
    print("5. 长时间未比赛的选手RD会增大")