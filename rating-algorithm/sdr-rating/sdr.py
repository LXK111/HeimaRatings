import json


class Player:
    def __init__(self, name, rating=1500):
        self.name = name
        self.rating = rating
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
            "matches": self.matches,
            "wins": self.wins,
            "losses": self.losses,
            "draws": self.draws
        }

    def __repr__(self):
        return f"Player(name={self.name}, rating={self.rating:.1f}, matches={self.matches}, wins={self.wins})"


class Match:
    def __init__(self, player1, player2, score1, score2):
        self.player1 = player1
        self.player2 = player2
        self.score1 = score1
        self.score2 = score2
        self.result = self._determine_result()
        self.score_diff = abs(score1 - score2)

    def _determine_result(self):
        if self.score1 > self.score2:
            return 1
        elif self.score1 < self.score2:
            return 0
        else:
            return 0.5


class SDRCalculator:
    def __init__(self, k_factor=32, score_weight=0.05):
        self.k_factor = k_factor
        self.score_weight = score_weight

    def calculate_expected_score(self, rating1, rating2):
        return 1 / (1 + 10 ** ((rating2 - rating1) / 400))

    def calculate_new_rating(self, player, opponent, match):
        expected = self.calculate_expected_score(player.rating, opponent.rating)
        
        if match.result == 1:
            actual = 1 + self.score_weight * match.score_diff
        elif match.result == 0:
            actual = 0 - self.score_weight * match.score_diff
        else:
            actual = 0.5
        
        return player.rating + self.k_factor * (actual - expected)

    def update_ratings(self, match):
        new_rating1 = self.calculate_new_rating(match.player1, match.player2, match)
        new_rating2 = self.calculate_new_rating(match.player2, match.player1, Match(match.player2, match.player1, match.score2, match.score1))

        match.player1.rating = new_rating1
        match.player2.rating = new_rating2

        result_for_p1 = match.result
        result_for_p2 = 1 - result_for_p1 if result_for_p1 != 0.5 else 0.5
        
        match.player1.update_record(result_for_p1)
        match.player2.update_record(result_for_p2)

    def get_rankings(self, players):
        return sorted(players, key=lambda p: p.rating, reverse=True)

    def load_players_from_json(self, json_data):
        players = {}
        for player_data in json_data:
            name = player_data["name"]
            rating = player_data.get("rating", 1500)
            players[name] = Player(name, rating)
        return players

    def process_matches_from_json(self, players, matches_json):
        for period_data in matches_json:
            for match_data in period_data:
                player1 = players[match_data["player1"]]
                player2 = players[match_data["player2"]]
                score1 = match_data["score1"]
                score2 = match_data["score2"]
                match = Match(player1, player2, score1, score2)
                self.update_ratings(match)

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