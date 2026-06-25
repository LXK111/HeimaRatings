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


class Glicko2Calculator:
    def __init__(self, tau=1.0, epsilon=0.000001):
        self.tau = tau
        self.epsilon = epsilon
        self.scale = 173.7178

    def _to_glicko2(self, rating):
        return (rating - 1500) / self.scale

    def _to_original(self, rating):
        return rating * self.scale + 1500

    def _g(self, rd):
        return 1 / math.sqrt(1 + (3 * rd**2) / (math.pi**2))

    def _E(self, rating, opp_rating, opp_rd):
        return 1 / (1 + math.exp(-self._g(opp_rd) * (rating - opp_rating)))

    def _v(self, player, opponents):
        v_sum = 0
        r = self._to_glicko2(player.rating)
        for opp, score in opponents:
            opp_r = self._to_glicko2(opp.rating)
            opp_rd = opp.rd / self.scale
            g = self._g(opp_rd)
            e = self._E(r, opp_r, opp_rd)
            v_sum += g**2 * e * (1 - e)
        return 1 / v_sum

    def _delta(self, player, opponents):
        delta_sum = 0
        r = self._to_glicko2(player.rating)
        for opp, score in opponents:
            opp_r = self._to_glicko2(opp.rating)
            opp_rd = opp.rd / self.scale
            g = self._g(opp_rd)
            e = self._E(r, opp_r, opp_rd)
            delta_sum += g * (score - e)
        return self._v(player, opponents) * delta_sum

    def _f(self, x, player, opponents, delta, v):
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

    def _find_x(self, player, opponents, delta, v):
        a = math.log(player.sigma**2)
        
        if delta**2 > (player.rd / self.scale)**2 + v:
            b = math.log(delta**2 - (player.rd / self.scale)**2 - v)
        else:
            k = 1
            while self._f(a - k * self.tau, player, opponents, delta, v) < 0:
                k += 1
            b = a - k * self.tau
        
        f_a = self._f(a, player, opponents, delta, v)
        f_b = self._f(b, player, opponents, delta, v)
        
        while abs(b - a) > self.epsilon:
            c = a + (a - b) * f_a / (f_b - f_a)
            f_c = self._f(c, player, opponents, delta, v)
            
            if f_c * f_b < 0:
                a = b
                f_a = f_b
            else:
                f_a /= 2
            
            b = c
            f_b = f_c
        
        return a

    def update_player(self, player, opponents):
        if not opponents:
            new_rd = math.sqrt(player.rd**2 + player.sigma**2)
            player.rd = min(new_rd, 350)
            return

        v = self._v(player, opponents)
        delta = self._delta(player, opponents)
        
        x = self._find_x(player, opponents, delta, v)
        new_sigma = math.exp(x / 2)
        
        rd_g2 = player.rd / self.scale
        d = math.sqrt(1 / (1 / rd_g2**2 + 1 / v))
        new_rd_g2 = 1 / math.sqrt(1 / d**2 + 1 / new_sigma**2)
        
        r = self._to_glicko2(player.rating)
        new_r_g2 = r + (new_rd_g2**2) * sum(
            self._g(opp.rd / self.scale) * (score - self._E(r, self._to_glicko2(opp.rating), opp.rd / self.scale))
            for opp, score in opponents
        )
        
        player.rating = self._to_original(new_r_g2)
        player.rd = new_rd_g2 * self.scale
        player.sigma = new_sigma

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
            
            for match_data in period_data:
                p1_name = match_data["player1"]
                p2_name = match_data["player2"]
                result = match_data.get("result", None)
                
                if result is None:
                    score1 = match_data["score1"]
                    score2 = match_data["score2"]
                    result = 1 if score1 > score2 else 0 if score1 < score2 else 0.5
                else:
                    result = float(result)
                
                p1 = players[p1_name]
                p2 = players[p2_name]
                
                player_opponents[p1_name].append((p2, result))
                player_opponents[p2_name].append((p1, 1 - result))
                
                p1.update_record(result)
                p2.update_record(1 - result)
            
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