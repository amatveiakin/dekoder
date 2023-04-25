import {
  type LoaderArgs,
  type ActionArgs,
  type V2_MetaFunction,
  json,
} from "@remix-run/node";
import React, { useState } from "react";
import {
  BottomNavigation,
  BottomNavigationAction,
  Button,
  Card,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  styled,
  tableCellClasses,
} from "@mui/material";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";
import SummarizeIcon from "@mui/icons-material/Summarize";
import PasswordIcon from "@mui/icons-material/Password";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { Form, useLoaderData, useParams } from "@remix-run/react";

const fsPromises = require("fs").promises;

export const meta: V2_MetaFunction = () => {
  return [{ title: "Dekoder" }];
};

const TOTAL_TEAM_WORDS = 4;
const TEAM_WORDS_PER_ROUND = 3;

const GAME_RESULT_ACTIVE = "active";
const GAME_RESULT_DRAW = "draw";

function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

function allTeams(): string[] {
  return ["red", "blue"];
}
function otherTeam(team: string): string {
  return team === "red" ? "blue" : "red";
}
function verifyTeam(team: string): string | undefined {
  return allTeams().includes(team) ? team : undefined;
}

class RoundItem {
  constructor(
    public answer: number, // word_id
    public explanation?: string,
    public guess?: { [team: string]: number } // word_id
  ) {}
}

class Round {
  constructor(
    public round_id: number,
    public teams: { [team: string]: RoundItem[] }
  ) {}
}

class PastRoundDisplayItem {
  constructor(
    public answer: number,
    public explanation: string,
    public guess: number
  ) {}
}

class PastRoundDisplay {
  constructor(public round_id: number, public items: PastRoundDisplayItem[]) {}
}

class Word {
  constructor(public word_id: number, public word: string) {}
}

function wordById(words: Word[], id: number): Word {
  return words.find((w) => w.word_id === id)!;
}

class Summary {
  constructor(
    public word_id: number,
    public word: string,
    public explanations: string[]
  ) {}
}

function makeSummaries(
  team: string,
  words: Word[],
  rounds: Round[]
): Summary[] {
  const summaries: Summary[] = [];
  for (const word of words) {
    const explanations: string[] = [];
    for (const round of rounds) {
      for (const item of round.teams[team]) {
        if (item.answer === word.word_id) {
          explanations.push(item.explanation!);
        }
      }
    }
    summaries.push(new Summary(word.word_id, word.word, explanations));
  }
  return summaries;
}

class Badges {
  constructor(public good_badges: number, public bad_badges: number) {}
}

function makeBadges(ourTeam: string, data: GameData): Badges {
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
function getGameResult(data: GameData): string {
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

enum RoundStage {
  Explain,
  Guess,
  Done,
}

function teamExplainedWords(team: string, round: Round): boolean {
  return round.teams[team].every((item) => !!item.explanation);
}

function teamGuessedWordsBy(
  team: string,
  explainerTeam: string,
  round: Round
): boolean {
  return round.teams[explainerTeam].every((item) => !!item.guess?.[team]);
}

function teamGuessedAllWords(team: string, round: Round): boolean {
  return allTeams().every((explainerTeam) =>
    teamGuessedWordsBy(team, explainerTeam, round)
  );
}

function getRoundStage(round: Round): RoundStage {
  if (!allTeams().every((team) => teamExplainedWords(team, round))) {
    return RoundStage.Explain;
  }
  if (!allTeams().every((team) => teamGuessedAllWords(team, round))) {
    return RoundStage.Guess;
  }
  return RoundStage.Done;
}

class LoginData {
  constructor(public ourTeam: string) {}
}

class GameData {
  constructor(
    public words: { [team: string]: Word[] },
    public pastRounds: Round[], // always RoundStage.Done
    public currentRound?: Round
  ) {}
}

function gameDataFromJson(jsonText: string): GameData {
  // TODO: Add validation
  return JSON.parse(jsonText) as GameData;
}

function gameDataToJson(data: GameData): string {
  return JSON.stringify(data, null, 2);
}

class ClientData {
  constructor(
    public loginData: LoginData,
    public gameData: GameData,
    public captainMode: boolean
  ) {}

  private roundsByTeam(team: string): PastRoundDisplay[] {
    return this.gameData.pastRounds.map((round) => {
      return new PastRoundDisplay(
        round.round_id,
        round.teams[team].map((item) => {
          return new PastRoundDisplayItem(
            item.answer,
            item.explanation!,
            item.guess![this.loginData.ourTeam]
          );
        })
      );
    });
  }
  private summariesByTeam(team: string): Summary[] {
    return makeSummaries(
      team,
      this.gameData.words[team],
      this.gameData.pastRounds
    );
  }

  public currentRound(): Round | undefined {
    return this.gameData.currentRound;
  }
  public ourWords(): Word[] {
    return this.gameData.words[this.loginData.ourTeam];
  }
  public ourRounds(): PastRoundDisplay[] {
    return this.roundsByTeam(this.loginData.ourTeam);
  }
  public theirRounds(): PastRoundDisplay[] {
    return this.roundsByTeam(otherTeam(this.loginData.ourTeam));
  }
  public ourSummaries(): Summary[] {
    return this.summariesByTeam(this.loginData.ourTeam);
  }
  public theirSummaries(): Summary[] {
    return this.summariesByTeam(otherTeam(this.loginData.ourTeam));
  }
}

const WideTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
    fontWeight: 700,
  },
  [`&.featured-table-head`]: {
    backgroundColor: theme.palette.secondary.main,
    color: theme.palette.common.black,
  },
  [`&.${tableCellClasses.body}`]: {},
}));

const NarrowTableCell = styled(WideTableCell)(() => ({
  "&": {
    width: 20,
  },
}));
const NarrowishTableCell = styled(WideTableCell)(() => ({
  "&": {
    width: 72,
  },
}));

const NormalTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(even)": {
    backgroundColor: theme.palette.action.hover,
  },
}));
// Hides last border. Use when is nothing below the table (e.g. table occupies the whole card).
// TODO: Do this with parameters instead (ideally table parameters).
const BottomlessTableRow = styled(NormalTableRow)(() => ({
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

function roundCard(round: PastRoundDisplay) {
  return (
    <Card key={round.round_id}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <NormalTableRow>
              <WideTableCell>
                # {String(round.round_id).padStart(2, "0")}
              </WideTableCell>
              <NarrowTableCell align="center">❔</NarrowTableCell>
              <NarrowTableCell align="center">❕</NarrowTableCell>
            </NormalTableRow>
          </TableHead>
          <TableBody>
            {round.items.map((item) => (
              <BottomlessTableRow key={item.explanation}>
                <WideTableCell>{item.explanation}</WideTableCell>
                <NarrowTableCell align="center">{item.guess}</NarrowTableCell>
                <NarrowTableCell align="center">{item.answer}</NarrowTableCell>
              </BottomlessTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

function summaryCard(summary: Summary, showWords: boolean) {
  return (
    <Card key={summary.word_id}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <NormalTableRow>
              <WideTableCell>
                {/* TODO: Is it a good idea to show your words?
                    It increases the chance of exposing them accidentally. */}
                {summary.word_id} {showWords ? summary.word : "🔮"}
              </WideTableCell>
            </NormalTableRow>
          </TableHead>
          <TableBody>
            {summary.explanations.map((explanation) => (
              <BottomlessTableRow key={explanation}>
                <WideTableCell>{explanation}</WideTableCell>
              </BottomlessTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

function badgeIcons(badges: Badges) {
  let ret = "";
  if (badges.good_badges > 0) {
    ret += "⭐️".repeat(badges.good_badges);
  }
  if (badges.bad_badges > 0) {
    ret += "☠️".repeat(badges.bad_badges);
  }
  return ret ? ret : "–";
}

function badgesCard(clientData: ClientData) {
  const ourTeam = clientData.loginData.ourTeam;
  const gameResult = getGameResult(clientData.gameData);
  let gameOverMessage;
  if (gameResult === ourTeam) {
    gameOverMessage = "🏆 We won!";
  } else if (gameResult === otherTeam(ourTeam)) {
    gameOverMessage = "😕 We lost.";
  } else if (gameResult === GAME_RESULT_DRAW) {
    gameOverMessage = "⚖️ It's a draw.";
  }
  const gameOver = gameOverMessage !== undefined;
  return (
    <Card
      sx={{
        px: 1.5,
        py: 1,
        backgroundColor: gameOver ? "primary.dark" : undefined,
        color: gameOver ? "common.white" : undefined,
      }}
    >
      {gameOverMessage && (
        <Typography variant="h6" sx={{ mb: 1 }}>
          {gameOverMessage}
        </Typography>
      )}
      {[ourTeam, otherTeam(ourTeam)].map((team) => (
        <Typography key={team} variant="body1">
          {team == ourTeam ? "Our badges:" : "Their badges:"}
          {badgeIcons(makeBadges(team, clientData.gameData))}
        </Typography>
      ))}
    </Card>
  );
}

function ourWordsView(words: Word[]) {
  return (
    <Card>
      <TableContainer>
        <Table size="small">
          <TableBody>
            {words.map((w) => (
              <BottomlessTableRow key={w.word_id}>
                <NarrowTableCell
                  className={tableCellClasses.head}
                  align="center"
                >
                  {w.word_id}
                </NarrowTableCell>
                <WideTableCell>{w.word}</WideTableCell>
              </BottomlessTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

function enterExplanationsView(ourTeam: string, wordsToExplain: Word[]) {
  // const formErrors = useActionData<typeof action>();
  return (
    <Card>
      <Form method="post" reloadDocument>
        <Stack alignItems="flex-end">
          <input type="hidden" name="team" value={ourTeam} />
          <TableContainer>
            <Table size="small">
              <TableBody>
                {wordsToExplain.map((w) => (
                  <NormalTableRow key={w.word_id}>
                    <NarrowTableCell
                      className={`${tableCellClasses.head} featured-table-head`}
                      align="center"
                    >
                      {w.word_id}
                    </NarrowTableCell>
                    <WideTableCell>
                      <TextField
                        hiddenLabel
                        size="small"
                        variant="standard"
                        fullWidth
                        type="text"
                        required
                        autoComplete="off"
                        name={`explanation-${w.word_id}`}
                      />
                    </WideTableCell>
                  </NormalTableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Button variant="contained" type="submit" sx={{ m: 1 }}>
            Submit
          </Button>
        </Stack>
      </Form>
    </Card>
  );
}

function waitingForExplanationsView(setCaptainMode: any) {
  return (
    <>
      <Card>
        <Typography variant="body2" m={1}>
          Waiting for explanations...
        </Typography>
      </Card>
      <Stack alignItems="center">
        {/* TODO: confirmation */}
        <Button
          startIcon={<LockOpenIcon />}
          variant="contained"
          onClick={() => setCaptainMode(true)}
        >
          To captian mode!
        </Button>
      </Stack>
    </>
  );
}

function enterGuessesView(ourTeam: string, round: Round) {
  return [ourTeam, otherTeam(ourTeam)].map(
    (explainerTeam) =>
      !teamGuessedWordsBy(ourTeam, explainerTeam, round) && (
        <Card key={explainerTeam}>
          <Form method="post">
            <Stack alignItems="flex-end">
              <input type="hidden" name="team" value={ourTeam} />
              <input
                type="hidden"
                name="explainer-team"
                value={explainerTeam}
              />
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <NormalTableRow>
                      <WideTableCell className="featured-table-head">
                        {explainerTeam === ourTeam
                          ? "Our words"
                          : "Their words"}
                      </WideTableCell>
                      <NarrowTableCell className="featured-table-head"></NarrowTableCell>
                    </NormalTableRow>
                  </TableHead>
                  <TableBody>
                    {round.teams[explainerTeam].map((item) => (
                      <NormalTableRow key={item.answer}>
                        <WideTableCell>{item.explanation}</WideTableCell>
                        <NarrowishTableCell>
                          <TextField
                            hiddenLabel
                            size="small"
                            variant="standard"
                            fullWidth
                            type="number"
                            inputProps={{ min: 1, max: TOTAL_TEAM_WORDS }}
                            required
                            autoComplete="off"
                            name={`guess-${item.answer}`}
                          />
                        </NarrowishTableCell>
                      </NormalTableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Button variant="contained" type="submit" sx={{ m: 1 }}>
                Submit
              </Button>
            </Stack>
          </Form>
        </Card>
      )
  );
}

function waitingForOpponentView() {
  return (
    <Card>
      <Typography variant="body2" m={1}>
        Waiting for the other team...
      </Typography>
    </Card>
  );
}

function MainView(
  clientData: ClientData,
  captainMode: boolean,
  setCaptainMode: any
) {
  let currentRoundWidget = null;
  const ourTeam = clientData.loginData.ourTeam;
  const currentRound = clientData.currentRound();
  if (currentRound) {
    switch (getRoundStage(currentRound)) {
      case RoundStage.Explain: {
        if (teamExplainedWords(ourTeam, currentRound)) {
          currentRoundWidget = waitingForOpponentView();
        } else {
          if (captainMode) {
            const words = clientData.ourWords();
            const wordsToExplain = currentRound.teams[ourTeam].map((item) =>
              wordById(words, item.answer)
            );
            currentRoundWidget = enterExplanationsView(
              clientData.loginData.ourTeam,
              wordsToExplain
            );
          } else {
            currentRoundWidget = waitingForExplanationsView(setCaptainMode);
          }
        }
        break;
      }
      case RoundStage.Guess: {
        if (teamGuessedAllWords(ourTeam, currentRound)) {
          currentRoundWidget = waitingForOpponentView();
        } else {
          currentRoundWidget = enterGuessesView(
            clientData.loginData.ourTeam,
            currentRound
          );
        }
        break;
      }
      case RoundStage.Done: {
        // Should not happen.
        break;
      }
    }
  }
  return (
    <Stack spacing={2}>
      {badgesCard(clientData)}
      {ourWordsView(clientData.ourWords())}
      {currentRoundWidget}
    </Stack>
  );
}

function RoundsView(rounds: PastRoundDisplay[]) {
  return <Stack spacing={2}>{rounds.map((r) => roundCard(r))}</Stack>;
}

function SummariesView(summaries: Summary[], showWords: boolean) {
  return (
    <Stack spacing={2}>{summaries.map((s) => summaryCard(s, showWords))}</Stack>
  );
}

function gameFile(params: any): string {
  return `../game-data/${params.gameId}`;
}

export async function loader({ params }: LoaderArgs) {
  return await fsPromises.readFile(gameFile(params), "utf8");
}

export async function action({ params, request }: ActionArgs) {
  // TODO: Don't crash on bad data.
  const gameData = gameDataFromJson(
    await fsPromises.readFile(gameFile(params), "utf8")
  );
  const formData = await request.formData();

  // console.log("=== BEGIN ===");
  // for (var pair of formData.entries()) {
  //   console.log(pair[0] + ", " + pair[1]);
  // }
  // console.log("=== END ===");

  const currentRound = gameData.currentRound;
  if (currentRound) {
    switch (getRoundStage(currentRound)) {
      case RoundStage.Explain: {
        const team = verifyTeam(formData.get("team")!.toString())!;
        for (const item of currentRound.teams[team]) {
          item.explanation = formData
            .get(`explanation-${item.answer}`)!
            .toString();
        }
        break;
      }
      case RoundStage.Guess: {
        const team = verifyTeam(formData.get("team")!.toString())!;
        const explainerTeam = verifyTeam(
          formData.get("explainer-team")!.toString()
        )!;
        for (const item of currentRound.teams[explainerTeam]) {
          item.guess = item.guess || {};
          item.guess[team] = Number(formData.get(`guess-${item.answer}`)!);
        }
        break;
      }
      case RoundStage.Done: {
        console.error("Current round cannot be in Done stage.");
        break;
      }
    }
    if (getRoundStage(currentRound) == RoundStage.Done) {
      const lastRoundId = currentRound.round_id;
      gameData.pastRounds.push(currentRound);
      const gameResult = getGameResult(gameData);
      if (gameResult === "active") {
        const teams: any = {};
        for (const t of allTeams()) {
          teams[t] = Array.from(
            { length: TEAM_WORDS_PER_ROUND },
            () => new RoundItem(getRandomInt(TOTAL_TEAM_WORDS) + 1)
          );
        }
        gameData.currentRound = new Round(lastRoundId + 1, teams);
      } else {
        gameData.currentRound = undefined;
      }
    }
  } else {
    // Game is over
  }
  await fsPromises.writeFile(
    gameFile(params),
    gameDataToJson(gameData),
    "utf8"
  );
  return json({ ok: true });
}

export default function Game() {
  const { team } = useParams();
  const loginData = new LoginData(team!);
  const gameData = gameDataFromJson(useLoaderData<typeof loader>());
  const [tabIndex, setTableIndex] = useState(0);
  const [captainMode, setCaptainMode] = useState(false);
  const clientData = new ClientData(loginData, gameData, captainMode);

  const body = {
    0: MainView(clientData, captainMode, setCaptainMode),
    1: RoundsView(clientData.ourRounds()),
    2: RoundsView(clientData.theirRounds()),
    3: SummariesView(clientData.ourSummaries(), true),
    4: SummariesView(clientData.theirSummaries(), false),
  }[tabIndex];

  return (
    <Container>
      <Container sx={{ pt: 2, pb: 12 }}>{body}</Container>
      <Paper
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
        elevation={5}
      >
        <BottomNavigation
          sx={{ height: 72 }} // accomodate two-line buttons
          value={tabIndex}
          onChange={(event, newValue) => {
            setTableIndex(newValue);
          }}
        >
          <BottomNavigationAction label="Operations" icon={<PasswordIcon />} />
          <BottomNavigationAction
            label="Our Rounds"
            icon={<ViewListOutlinedIcon />}
          />
          <BottomNavigationAction
            label="Their Rounds"
            icon={<ViewListIcon />}
          />
          <BottomNavigationAction
            label="Our Summary"
            icon={<SummarizeOutlinedIcon />}
          />
          <BottomNavigationAction
            label="Their Summary"
            icon={<SummarizeIcon />}
          />
        </BottomNavigation>
      </Paper>
    </Container>
  );
}
