import sys
sys.path.insert(0, '../glicko2-rating')
sys.path.insert(0, '../sdr-rating')

from glicko2 import Player as Glicko2Player, Glicko2Calculator
from sdr import Player as SDRPlayer, Match as SDRMatch, SDRCalculator
from sdr_glicko2 import Player as HybridPlayer, Match as HybridMatch, SDRGlicko2Calculator


def run_glicko2():
    calc = Glicko2Calculator(tau=0.5)
    players = {
        "Zhang Wei": Glicko2Player("Zhang Wei", rating=1600, rd=100),
        "Li Ming": Glicko2Player("Li Ming", rating=1550, rd=100),
        "Wang Fang": Glicko2Player("Wang Fang", rating=1500, rd=150),
        "Chen Yu": Glicko2Player("Chen Yu", rating=1450, rd=150),
        "Liu Jie": Glicko2Player("Liu Jie", rating=1400, rd=200),
        "Zhao Qiang": Glicko2Player("Zhao Qiang", rating=1350, rd=200),
    }
    
    match_groups = [
        [("Zhang Wei", "Li Ming", 1)],
        [("Wang Fang", "Chen Yu", 1)],
        [("Liu Jie", "Zhao Qiang", 1)],
        [("Zhang Wei", "Wang Fang", 0.5)],
        [("Li Ming", "Chen Yu", 1)],
        [("Liu Jie", "Zhang Wei", 0)],
        [("Zhao Qiang", "Wang Fang", 0)],
        [("Li Ming", "Liu Jie", 0.5)],
        [("Chen Yu", "Zhao Qiang", 1)],
        [("Zhang Wei", "Zhao Qiang", 1)],
    ]
    
    for matches in match_groups:
        player_opponents = {name: [] for name in players}
        for p1_name, p2_name, result in matches:
            p1 = players[p1_name]
            p2 = players[p2_name]
            player_opponents[p1_name].append((p2, result))
            player_opponents[p2_name].append((p1, 1 - result))
            p1.update_record(result)
            p2.update_record(1 - result)
        
        for name in players:
            calc.update_player(players[name], player_opponents[name])
    
    return sorted(players.values(), key=lambda p: p.rating, reverse=True)


def run_sdr():
    calc = SDRCalculator(k_factor=32, score_weight=0.05)
    players = {
        "Zhang Wei": SDRPlayer("Zhang Wei", rating=1600),
        "Li Ming": SDRPlayer("Li Ming", rating=1550),
        "Wang Fang": SDRPlayer("Wang Fang", rating=1500),
        "Chen Yu": SDRPlayer("Chen Yu", rating=1450),
        "Liu Jie": SDRPlayer("Liu Jie", rating=1400),
        "Zhao Qiang": SDRPlayer("Zhao Qiang", rating=1350),
    }
    
    matches = [
        SDRMatch(players["Zhang Wei"], players["Li Ming"], 15, 10),
        SDRMatch(players["Wang Fang"], players["Chen Yu"], 12, 8),
        SDRMatch(players["Liu Jie"], players["Zhao Qiang"], 18, 15),
        SDRMatch(players["Zhang Wei"], players["Wang Fang"], 14, 14),
        SDRMatch(players["Li Ming"], players["Chen Yu"], 16, 12),
        SDRMatch(players["Liu Jie"], players["Zhang Wei"], 10, 20),
        SDRMatch(players["Zhao Qiang"], players["Wang Fang"], 9, 13),
        SDRMatch(players["Li Ming"], players["Liu Jie"], 11, 11),
        SDRMatch(players["Chen Yu"], players["Zhao Qiang"], 17, 5),
        SDRMatch(players["Zhang Wei"], players["Zhao Qiang"], 25, 5),
    ]
    
    for match in matches:
        calc.update_ratings(match)
    
    return sorted(players.values(), key=lambda p: p.rating, reverse=True)


def run_hybrid():
    calc = SDRGlicko2Calculator(tau=0.5, score_weight=0.05)
    players = {
        "Zhang Wei": HybridPlayer("Zhang Wei", rating=1600, rd=100),
        "Li Ming": HybridPlayer("Li Ming", rating=1550, rd=100),
        "Wang Fang": HybridPlayer("Wang Fang", rating=1500, rd=150),
        "Chen Yu": HybridPlayer("Chen Yu", rating=1450, rd=150),
        "Liu Jie": HybridPlayer("Liu Jie", rating=1400, rd=200),
        "Zhao Qiang": HybridPlayer("Zhao Qiang", rating=1350, rd=200),
    }
    
    matches = [
        HybridMatch(players["Zhang Wei"], players["Li Ming"], 15, 10),
        HybridMatch(players["Wang Fang"], players["Chen Yu"], 12, 8),
        HybridMatch(players["Liu Jie"], players["Zhao Qiang"], 18, 15),
        HybridMatch(players["Zhang Wei"], players["Wang Fang"], 14, 14),
        HybridMatch(players["Li Ming"], players["Chen Yu"], 16, 12),
        HybridMatch(players["Liu Jie"], players["Zhang Wei"], 10, 20),
        HybridMatch(players["Zhao Qiang"], players["Wang Fang"], 9, 13),
        HybridMatch(players["Li Ming"], players["Liu Jie"], 11, 11),
        HybridMatch(players["Chen Yu"], players["Zhao Qiang"], 17, 5),
        HybridMatch(players["Zhang Wei"], players["Zhao Qiang"], 25, 5),
    ]
    
    for match in matches:
        calc.process_match(match)
    
    return sorted(players.values(), key=lambda p: p.rating, reverse=True)


def print_comparison(glicko2_players, sdr_players, hybrid_players):
    print(f"\n{'='*100}")
    print(f"{'算法对比':^100}")
    print(f"{'='*100}")
    print(f"{'排名':^6} | {'选手':^12} | {'Glicko-2':^10} | {'SDR':^10} | {'融合算法':^10} | {'差异(SDR-G2)':^12} | {'差异(Hybrid-G2)':^15}")
    print(f"{'-'*100}")
    
    for i in range(len(glicko2_players)):
        g2 = glicko2_players[i]
        sdr = sdr_players[i]
        hybrid = hybrid_players[i]
        diff_sdr = sdr.rating - g2.rating
        diff_hybrid = hybrid.rating - g2.rating
        
        print(f"{i+1:^6} | {g2.name:^12} | {g2.rating:^10.1f} | {sdr.rating:^10.1f} | {hybrid.rating:^10.1f} | {diff_sdr:^12.1f} | {diff_hybrid:^15.1f}")
    
    print(f"{'='*100}")


if __name__ == "__main__":
    print("\n=== 三种算法对比演示 ===")
    print("使用相同的比赛数据对比三种算法的评分结果")
    
    glicko2_result = run_glicko2()
    sdr_result = run_sdr()
    hybrid_result = run_hybrid()
    
    print_comparison(glicko2_result, sdr_result, hybrid_result)
    
    print("\n📊 算法差异分析:")
    print("• Glicko-2: 只考虑胜负结果，不考虑比分差距")
    print("• SDR: 在Elo基础上增加比分差距因素")
    print("• 融合算法: Glicko-2框架 + SDR比分敏感性")
    print("\n🎯 融合算法的优势:")
    print("1. 比分差距会影响评分变化（SDR特性）")
    print("2. 三参数系统管理评分不确定性（Glicko-2特性）")
    print("3. RD值反映评分可靠性")
    print("4. 适合比赛频率不稳定的场景")