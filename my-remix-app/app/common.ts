export function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}
export function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(arr.length)];
}
export function randomChoiceString(s: string): string {
  return s[randomInt(s.length)];
}
export function randomShuffle(arr: any[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export const TOTAL_TEAM_WORDS = 4;
export const TEAM_WORDS_PER_ROUND = 3;

export const GAME_RESULT_ACTIVE = "active";
export const GAME_RESULT_DRAW = "draw";

export function allTeams(): string[] {
  return ["red", "blue"];
}
export function otherTeam(team: string): string {
  return team === "red" ? "blue" : "red";
}
export function verifyTeam(team: string): string | undefined {
  return allTeams().includes(team) ? team : undefined;
}

export class Word {
  constructor(public word_id: number, public word: string) {}
}

export class RoundItem {
  constructor(
    public answer: number, // word_id
    public explanation?: string,
    public guess?: { [team: string]: number } // word_id
  ) {}
}

export class Round {
  constructor(
    public round_id: number,
    public teams: { [team: string]: RoundItem[] }
  ) {}
}

export class GameData {
  constructor(
    public words: { [team: string]: Word[] },
    public pastRounds: Round[], // always RoundStage.Done
    public currentRound?: Round
  ) {}
}

export enum RoundStage {
  Explain,
  Guess,
  Done,
}

export class Badges {
  constructor(public good_badges: number, public bad_badges: number) {}
}

export function gameDataFromJson(jsonText: string): GameData {
  // TODO: Add validation
  return JSON.parse(jsonText) as GameData;
}

export function gameDataToJson(data: GameData): string {
  return JSON.stringify(data, null, 2);
}

export function gameFile(gameId: string): string {
  return `../game-data/${gameId}`;
}

export function makeBadges(ourTeam: string, data: GameData): Badges {
  const theirTeam = otherTeam(ourTeam);
  let white_badges = 0;
  let black_badges = 0;
  for (const round of data.pastRounds) {
    if (!round.teams[ourTeam].every((i) => i.guess![ourTeam] === i.answer)) {
      black_badges += 1;
    }
    if (round.teams[theirTeam].every((i) => i.guess![ourTeam] === i.answer)) {
      white_badges += 1;
    }
  }
  return new Badges(white_badges, black_badges);
}

// Returns the winner, GAME_RESULT_DRAW or GAME_RESULT_ACTIVE.
export function getGameResult(data: GameData): string {
  const gameOver =
    data.pastRounds.length >= 8 ||
    allTeams().some((team) => {
      const badges = makeBadges(team, data);
      return badges.good_badges >= 2 || badges.bad_badges >= 2;
    });
  if (!gameOver) {
    return GAME_RESULT_ACTIVE;
  }
  const teamScore = (team: string) => {
    const badges = makeBadges(team, data);
    return badges.good_badges - badges.bad_badges;
  };
  const redScore = teamScore("red");
  const blueScore = teamScore("blue");
  if (redScore > blueScore) {
    return "red";
  } else if (blueScore > redScore) {
    return "blue";
  } else {
    return GAME_RESULT_DRAW;
  }
}

export function teamExplainedWords(team: string, round: Round): boolean {
  return round.teams[team].every((item) => !!item.explanation);
}

export function teamGuessedWordsBy(
  team: string,
  explainerTeam: string,
  round: Round
): boolean {
  return round.teams[explainerTeam].every((item) => !!item.guess?.[team]);
}

export function teamGuessedAllWords(team: string, round: Round): boolean {
  return allTeams().every((explainerTeam) =>
    teamGuessedWordsBy(team, explainerTeam, round)
  );
}

export function getRoundStage(round: Round): RoundStage {
  if (!allTeams().every((team) => teamExplainedWords(team, round))) {
    return RoundStage.Explain;
  }
  if (!allTeams().every((team) => teamGuessedAllWords(team, round))) {
    return RoundStage.Guess;
  }
  return RoundStage.Done;
}

export function postprocessGameData(data: GameData) {
  if (
    data.currentRound &&
    getRoundStage(data.currentRound) == RoundStage.Done
  ) {
    data.pastRounds.push(data.currentRound);
    data.currentRound = undefined;
  }
  if (!data.currentRound) {
    const gameResult = getGameResult(data);
    if (gameResult === "active") {
      const teams: any = {};
      for (const t of allTeams()) {
        const allWordIds = Array.from(
          { length: TOTAL_TEAM_WORDS },
          (_, i) => i + 1
        );
        randomShuffle(allWordIds);
        teams[t] = allWordIds
          .slice(0, TEAM_WORDS_PER_ROUND)
          .map((answer) => new RoundItem(answer));
      }
      const newRoundId = data.pastRounds.length + 1;
      data.currentRound = new Round(newRoundId, teams);
    }
  }
}
