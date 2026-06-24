import type {
  MatchSummary,
  PlayerSummary,
  RankingRow,
  RankingSnapshotSummary,
  TournamentEventSummary,
  TournamentSummary,
  WeaponType
} from "@/lib/domain/types";

export const weaponTypes: WeaponType[] = [
  { id: "weapon-longsword", name: "长剑", slug: "longsword", enabled: true },
  { id: "weapon-sabre", name: "军刀", slug: "sabre", enabled: true },
  { id: "weapon-rapier", name: "迅捷剑", slug: "rapier", enabled: true },
  { id: "weapon-dagger", name: "匕首", slug: "dagger", enabled: false }
];

export const players: PlayerSummary[] = [
  {
    id: "player-001",
    name: "林澈",
    club: "北境剑术会",
    weaponRatings: [
      { weaponTypeId: "weapon-longsword", rating: 1812, rank: 1 },
      { weaponTypeId: "weapon-sabre", rating: 1630, rank: 5 }
    ]
  },
  {
    id: "player-002",
    name: "周衡",
    club: "铜环训练场",
    weaponRatings: [
      { weaponTypeId: "weapon-longsword", rating: 1764, rank: 2 },
      { weaponTypeId: "weapon-rapier", rating: 1701, rank: 1 }
    ]
  },
  {
    id: "player-003",
    name: "许岚",
    club: "白鸦 HEMA",
    weaponRatings: [
      { weaponTypeId: "weapon-longsword", rating: 1698, rank: 3 },
      { weaponTypeId: "weapon-sabre", rating: 1744, rank: 1 }
    ]
  }
];

export const tournaments: TournamentSummary[] = [
  {
    id: "tournament-001",
    name: "HEMA 春季积分赛",
    status: "active",
    eventCount: 3,
    matchCount: 42,
    defaultAlgorithm: "hybrid"
  },
  {
    id: "tournament-002",
    name: "城市俱乐部邀请赛",
    status: "draft",
    eventCount: 2,
    matchCount: 0,
    defaultAlgorithm: "hybrid"
  }
];

export const tournamentEvents: TournamentEventSummary[] = [
  {
    id: "event-longsword-open",
    tournamentId: "tournament-001",
    weaponTypeId: "weapon-longsword",
    name: "长剑公开组",
    format: "single_elimination",
    status: "active",
    matchCount: 24
  },
  {
    id: "event-sabre-open",
    tournamentId: "tournament-001",
    weaponTypeId: "weapon-sabre",
    name: "军刀公开组",
    format: "single_elimination",
    status: "active",
    matchCount: 12
  },
  {
    id: "event-rapier-invite",
    tournamentId: "tournament-001",
    weaponTypeId: "weapon-rapier",
    name: "迅捷剑邀请组",
    format: "round_robin",
    status: "draft",
    matchCount: 6
  }
];

export const matches: MatchSummary[] = [
  {
    id: "match-001",
    tournamentId: "tournament-001",
    eventId: "event-longsword-open",
    weaponTypeId: "weapon-longsword",
    round: 1,
    player1Name: "林澈",
    player2Name: "周衡",
    score1: 9,
    score2: 6,
    winnerName: "林澈"
  },
  {
    id: "match-002",
    tournamentId: "tournament-001",
    eventId: "event-longsword-open",
    weaponTypeId: "weapon-longsword",
    round: 2,
    player1Name: "许岚",
    player2Name: "林澈",
    score1: 7,
    score2: 9,
    winnerName: "林澈"
  },
  {
    id: "match-003",
    tournamentId: "tournament-001",
    eventId: "event-sabre-open",
    weaponTypeId: "weapon-sabre",
    round: 1,
    player1Name: "许岚",
    player2Name: "林澈",
    score1: 9,
    score2: 5,
    winnerName: "许岚"
  }
];

export const rankingSnapshots: RankingSnapshotSummary[] = [
  {
    id: "snapshot-001",
    weaponTypeId: "weapon-longsword",
    algorithm: "hybrid",
    generatedAt: "2026-06-24 12:00",
    leaderName: "林澈",
    leaderRating: 1812
  },
  {
    id: "snapshot-002",
    weaponTypeId: "weapon-sabre",
    algorithm: "sdr",
    generatedAt: "2026-06-23 20:30",
    leaderName: "许岚",
    leaderRating: 1744
  }
];

export const rankingsByWeapon: Record<string, RankingRow[]> = {
  "weapon-longsword": [
    {
      playerId: "player-001",
      name: "林澈",
      club: "北境剑术会",
      rank: 1,
      rating: 1812,
      matches: 12,
      wins: 10,
      losses: 2
    },
    {
      playerId: "player-002",
      name: "周衡",
      club: "铜环训练场",
      rank: 2,
      rating: 1764,
      matches: 10,
      wins: 7,
      losses: 3
    },
    {
      playerId: "player-003",
      name: "许岚",
      club: "白鸦 HEMA",
      rank: 3,
      rating: 1698,
      matches: 9,
      wins: 6,
      losses: 3
    }
  ],
  "weapon-sabre": [
    {
      playerId: "player-003",
      name: "许岚",
      club: "白鸦 HEMA",
      rank: 1,
      rating: 1744,
      matches: 11,
      wins: 8,
      losses: 3
    },
    {
      playerId: "player-001",
      name: "林澈",
      club: "北境剑术会",
      rank: 5,
      rating: 1630,
      matches: 7,
      wins: 5,
      losses: 2
    }
  ],
  "weapon-rapier": [
    {
      playerId: "player-002",
      name: "周衡",
      club: "铜环训练场",
      rank: 1,
      rating: 1701,
      matches: 8,
      wins: 6,
      losses: 2
    }
  ]
};
