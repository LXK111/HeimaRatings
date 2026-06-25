import math
import json


class Player:
    def __init__(self, name, rating=1500, rd=350, sigma=0.06):
        self.name = name
        self.rating = rating
        self.rd = rd
        self.sigma = sigma
        self.matches = 0
        self.wins = 0
        self.losses = 0
        self.draws = 0

    def update_record(self, result):
        self.matches += 1
        if result == 1:
            self.wins += 1
        elif result == 0:
            self.losses += 1
        else:
            self.draws += 1

    def to_dict(self):
        return {
            "name": self.name,
            "rating": round(self.rating, 2),
            "rd": round(self.rd, 2),
            "sigma": round(self.sigma, 4),
            "matches": self.matches,
            "wins": self.wins,
            "losses": self.losses,
            "draws": self.draws
        }

    def __repr__(self):
        return f"Player(name={self.name}, rating={self.rating:.1f}, rd={self.rd:.1f}, sigma={self.sigma:.4f})"


class Match:
    def __init__(self, player1, player2, score1, score2):
        self.player1 = player1
        self.player2 = player2
        self.score1 = score1
        self.score2 = score2
        self.result = 1 if score1 > score2 else 0 if score1 < score2 else 0.5
        self.score_diff = abs(score1 - score2)


class SDRGlicko2Calculator:
    def __init__(self, tau=1.0, epsilon=0.000001, score_weight=0.05):
        self.tau = tau
        self.epsilon = epsilon
        self.scale = 173.7178
        self.score_weight = score_weight

    def _to_glicko2(self, rating):
        return (rating - 1500) / self.scale

    def _to_original(self, rating):
        return rating * self.scale + 1500

    def _g(self, rd):
        return 1 / math.sqrt(1 + (3 * rd**2) / (math.pi**2))

    def _E(self, rating, opp_rating, opp_rd):
        return 1 / (1 + math.exp(-self._g(opp_rd) * (rating - opp_rating)))

    def _get_adjusted_score(self, match, is_player1):
        if is_player1:
            score_diff = match.score_diff
            result = match.result
        else:
            score_diff = match.score_diff
            result = 1 - match.result

        if result == 1:
            return min(1 + self.score_weight * score_diff, 2.0)
        elif result == 0:
            return max(0 - self.score_weight * score_diff, -1.0)
        else:
            return 0.5

    def _v(self, player, opponents_with_matches):
        v_sum = 0
        r = self._to_glicko2(player.rating)
        for opp, match, is_player1 in opponents_with_matches:
            opp_r = self._to_glicko2(opp.rating)
            opp_rd = opp.rd / self.scale
            g = self._g(opp_rd)
            e = self._E(r, opp_r, opp_rd)
            v_sum += g**2 * e * (1 - e)
        return 1 / v_sum if v_sum > 0 else float('inf')

    def _delta(self, player, opponents_with_matches):
        delta_sum = 0
        r = self._to_glicko2(player.rating)
        for opp, match, is_player1 in opponents_with_matches:
            opp_r = self._to_glicko2(opp.rating)
            opp_rd = opp.rd / self.scale
            g = self._g(opp_rd)
            e = self._E(r, opp_r, opp_rd)
            s = self._get_adjusted_score(match, is_player1)
            delta_sum += g * (s - e)
        
        v = self._v(player, opponents_with_matches)
        return v * delta_sum if v != float('inf') else 0

    def _f(self, x, player, opponents_with_matches, delta, v):
        d2 = player.sigma**2
        d = d2 + x
        if d <= 0:
            return float('inf')
        sqrt_d = math.sqrt(d)
        
        a = math.log(player.sigma**2)
        b = (x - a) / (2 * x**2)
        
        delta_sq = delta**2
        c = (delta_sq - d - v) / (2 * d**2)
        
        return math.exp(x) * (c - b) - (a - x) / d

    def _find_x(self, player, opponents_with_matches, delta, v):
        a = math.log(player.sigma**2)
        
        rd_g2 = player.rd / self.scale
        if delta**2 > rd_g2**2 + v:
            b = math.log(delta**2 - rd_g2**2 - v)
        else:
            k = 1
            while self._f(a - k * self.tau, player, opponents_with_matches, delta, v) < 0:
                k += 1
            b = a - k * self.tau
        
        f_a = self._f(a, player, opponents_with_matches, delta, v)
        f_b = self._f(b, player, opponents_with_matches, delta, v)
        
        while abs(b - a) > self.epsilon:
            c = a + (a - b) * f_a / (f_b - f_a)
            f_c = self._f(c, player, opponents_with_matches, delta, v)
            
            if f_c * f_b < 0:
                a = b
                f_a = f_b
            else:
                f_a /= 2
            
            b = c
            f_b = f_c
        
        return a

    def update_player(self, player, opponents_with_matches):
        if not opponents_with_matches:
            new_rd = math.sqrt(player.rd**2 + player.sigma**2)
            player.rd = min(new_rd, 350)
            return

        v = self._v(player, opponents_with_matches)
        delta = self._delta(player, opponents_with_matches)
        
        x = self._find_x(player, opponents_with_matches, delta, v)
        new_sigma = math.exp(x / 2)
        
        rd_g2 = player.rd / self.scale
        d = math.sqrt(1 / (1 / rd_g2**2 + 1 / v))
        new_rd_g2 = 1 / math.sqrt(1 / d**2 + 1 / new_sigma**2)
        
        r = self._to_glicko2(player.rating)
        new_r_g2 = r + (new_rd_g2**2) * sum(
            self._g(opp.rd / self.scale) * (self._get_adjusted_score(match, is_player1) - self._E(r, self._to_glicko2(opp.rating), opp.rd / self.scale))
            for opp, match, is_player1 in opponents_with_matches
        )
        
        player.rating = self._to_original(new_r_g2)
        player.rd = new_rd_g2 * self.scale
        player.sigma = new_sigma

    def process_match(self, match):
        player1_opponents = [(match.player2, match, True)]
        player2_opponents = [(match.player1, match, False)]
        
        self.update_player(match.player1, player1_opponents)
        self.update_player(match.player2, player2_opponents)
        
        match.player1.update_record(match.result)
        match.player2.update_record(1 - match.result)

    def get_rankings(self, players):
        return sorted(players, key=lambda p: p.rating, reverse=True)

    def load_players_from_json(self, json_data):
        players = {}
        for player_data in json_data:
            name = player_data["name"]
            rating = player_data.get("rating", 1500)
            rd = player_data.get("rd", 350)
            sigma = player_data.get("sigma", 0.2)
            players[name] = Player(name, rating, rd, sigma)
        return players

    def process_matches_from_json(self, players, matches_json):
        for period_data in matches_json:
            player_opponents = {name: [] for name in players}
            all_matches = []
            
            for match_data in period_data:
                p1_name = match_data["player1"]
                p2_name = match_data["player2"]
                score1 = match_data["score1"]
                score2 = match_data["score2"]
                
                p1 = players[p1_name]
                p2 = players[p2_name]
                match = Match(p1, p2, score1, score2)
                all_matches.append(match)
                
                player_opponents[p1_name].append((p2, match, True))
                player_opponents[p2_name].append((p1, match, False))
                
                p1.update_record(match.result)
                p2.update_record(1 - match.result)
            
            for name in players:
                self.update_player(players[name], player_opponents[name])

    def get_rankings_json(self, players):
        rankings = self.get_rankings(list(players.values()))
        result = []
        for idx, player in enumerate(rankings, 1):
            player_dict = player.to_dict()
            player_dict["rank"] = idx
            result.append(player_dict)
        return json.dumps(result, ensure_ascii=False, indent=2)

    def run_from_json(self, input_json):
        data = json.loads(input_json)
        players = self.load_players_from_json(data["players"])
        self.process_matches_from_json(players, data["matches"])
        return self.get_rankings_json(players)