import random
import json
import sys
sys.path.insert(0, '../elo-rating')
sys.path.insert(0, '../sdr-rating')
sys.path.insert(0, '../glicko2-rating')
sys.path.insert(0, '../sdr-glicko2-hybrid')

from elo import EloCalculator
from sdr import SDRCalculator
from glicko2 import Glicko2Calculator
from sdr_glicko2 import SDRGlicko2Calculator


def generate_players(count=32):
    players = []
    for i in range(count):
        name = f"选手{i+1}"
        rating = 1400 + random.randint(0, 400)
        players.append({
            "name": name,
            "rating": rating
        })
    return players


def generate_match_score():
    score1 = random.randint(5, 9)
    score_diff = random.randint(1, 4)
    if random.random() < 0.15:
        score2 = min(9, score1 + random.randint(1, 2))
    else:
        score2 = max(0, score1 - score_diff)
    return score1, score2


def generate_knockout_bracket(players):
    matches = []
    current_round = [(p, i) for i, p in enumerate(players)]
    
    while len(current_round) > 1:
        round_matches = []
        random.shuffle(current_round)
        
        for i in range(0, len(current_round), 2):
            if i + 1 < len(current_round):
                p1, idx1 = current_round[i]
                p2, idx2 = current_round[i + 1]
                score1, score2 = generate_match_score()
                
                round_matches.append({
                    "player1": p1["name"],
                    "player2": p2["name"],
                    "score1": score1,
                    "score2": score2
                })
                
                if score1 > score2:
                    current_round[i // 2] = (p1, idx1)
                else:
                    current_round[i // 2] = (p2, idx2)
        
        matches.append(round_matches)
        current_round = current_round[:len(current_round) // 2]
    
    return matches


def generate_json_output(players, matches):
    return json.dumps({
        "tournament": {
            "name": "HEMA Championship 2026",
            "format": "Single Elimination",
            "players_count": len(players),
            "rounds": len(matches)
        },
        "players": players,
        "matches": matches
    }, ensure_ascii=False, indent=2)


def generate_md_report(players, elo_result, sdr_result, glicko2_result, hybrid_result, matches):
    elo_dict = {p["name"]: p for p in json.loads(elo_result)}
    sdr_dict = {p["name"]: p for p in json.loads(sdr_result)}
    glicko2_dict = {p["name"]: p for p in json.loads(glicko2_result)}
    hybrid_dict = {p["name"]: p for p in json.loads(hybrid_result)}
    
    md = "# HEMA 锦标赛排名报告\n\n"
    md += "## 比赛信息\n\n"
    md += f"- **比赛名称**: HEMA Championship 2026\n"
    md += f"- **赛制**: 单败淘汰赛\n"
    md += f"- **参赛人数**: {len(players)}\n"
    md += f"- **比赛轮次**: {len(matches)}\n"
    md += f"- **生成时间**: 2026年\n\n"
    
    md += "## 赛前选手信息\n\n"
    md += "| 序号 | 选手 | 赛前积分 |\n"
    md += "|------|------|----------|\n"
    for i, p in enumerate(sorted(players, key=lambda x: -x["rating"]), 1):
        md += f"| {i} | {p['name']} | {p['rating']} |\n"
    md += "\n"
    
    md += "## 比赛进程\n\n"
    for round_idx, round_matches in enumerate(matches, 1):
        md += f"### 第 {round_idx} 轮 ({len(round_matches)} 场比赛)\n\n"
        md += "| 序号 | 选手1 | 比分1 | 比分2 | 选手2 | 获胜者 |\n"
        md += "|------|-------|-------|-------|-------|--------|\n"
        for match_idx, match in enumerate(round_matches, 1):
            winner = match["player1"] if match["score1"] > match["score2"] else match["player2"]
            md += f"| {match_idx} | {match['player1']} | {match['score1']} | {match['score2']} | {match['player2']} | {winner} |\n"
        md += "\n"
    
    md += "## 赛后排名汇总\n\n"
    md += "| 综合排名 | 选手 | Elo积分 | Elo排名 | SDR积分 | SDR排名 | Glicko-2积分 | Glicko-2排名 | 融合算法积分 | 融合算法排名 |\n"
    md += "|----------|------|---------|---------|---------|---------|--------------|--------------|--------------|--------------|\n"
    
    all_players = set(elo_dict.keys())
    combined = []
    for name in all_players:
        elo = elo_dict[name]
        sdr = sdr_dict[name]
        g2 = glicko2_dict[name]
        hybrid = hybrid_dict[name]
        avg_rank = (elo["rank"] + sdr["rank"] + g2["rank"] + hybrid["rank"]) / 4
        combined.append({
            "name": name,
            "elo_rating": elo["rating"],
            "elo_rank": elo["rank"],
            "sdr_rating": sdr["rating"],
            "sdr_rank": sdr["rank"],
            "g2_rating": g2["rating"],
            "g2_rank": g2["rank"],
            "hybrid_rating": hybrid["rating"],
            "hybrid_rank": hybrid["rank"],
            "avg_rank": avg_rank
        })
    
    combined.sort(key=lambda x: x["avg_rank"])
    for i, p in enumerate(combined, 1):
        md += f"| {i} | {p['name']} | {p['elo_rating']:.1f} | {p['elo_rank']} | {p['sdr_rating']:.1f} | {p['sdr_rank']} | {p['g2_rating']:.1f} | {p['g2_rank']} | {p['hybrid_rating']:.1f} | {p['hybrid_rank']} |\n"
    
    md += "\n## 前三名\n\n"
    for i, p in enumerate(combined[:3], 1):
        title = ["冠军", "亚军", "季军"][i-1]
        md += f"### {i}. {title}: {p['name']}\n\n"
        md += f"- Elo积分: {p['elo_rating']:.1f} (排名第{p['elo_rank']})\n"
        md += f"- SDR积分: {p['sdr_rating']:.1f} (排名第{p['sdr_rank']})\n"
        md += f"- Glicko-2积分: {p['g2_rating']:.1f} (排名第{p['g2_rank']})\n"
        md += f"- 融合算法积分: {p['hybrid_rating']:.1f} (排名第{p['hybrid_rank']})\n\n"
    
    return md


def main():
    print("🎯 生成32人单败淘汰赛...")
    players = generate_players(32)
    print(f"✅ 已生成 {len(players)} 名选手")
    
    print("\n⚔️ 生成比赛进程...")
    matches = generate_knockout_bracket(players)
    print(f"✅ 已生成 {len(matches)} 轮比赛，共 {sum(len(r) for r in matches)} 场")
    
    print("\n📄 生成JSON文件...")
    json_output = generate_json_output(players, matches)
    with open("tournament_data.json", "w", encoding="utf-8") as f:
        f.write(json_output)
    print("✅ tournament_data.json 已保存")
    
    print("\n📊 运行Elo算法...")
    elo_calc = EloCalculator(k_factor=32)
    elo_result = elo_calc.run_from_json(json_output)
    
    print("📊 运行SDR算法...")
    sdr_calc = SDRCalculator(k_factor=32, score_weight=0.05)
    sdr_result = sdr_calc.run_from_json(json_output)
    
    print("📊 运行Glicko-2算法...")
    glicko2_calc = Glicko2Calculator(tau=0.5)
    glicko2_result = glicko2_calc.run_from_json(json_output)
    
    print("📊 运行融合算法...")
    hybrid_calc = SDRGlicko2Calculator(tau=0.5, score_weight=0.05)
    hybrid_result = hybrid_calc.run_from_json(json_output)
    
    print("\n📝 生成MD报告...")
    md_report = generate_md_report(players, elo_result, sdr_result, glicko2_result, hybrid_result, matches)
    with open("tournament_report.md", "w", encoding="utf-8") as f:
        f.write(md_report)
    print("✅ tournament_report.md 已保存")
    
    print("\n🎉 完成！")


if __name__ == "__main__":
    main()