import { type ActionArgs, type V2_MetaFunction, json } from "@remix-run/node";
import React, { useState } from "react";
import CssBaseline from "@mui/material/CssBaseline";
// import logo from "./logo.svg";  // TODO: add favicon
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Card,
  Container,
  Fab,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  styled,
  tableCellClasses,
} from "@mui/material";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";
import SummarizeIcon from "@mui/icons-material/Summarize";
import PasswordIcon from "@mui/icons-material/Password";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LockIcon from "@mui/icons-material/Lock";
import { Form, useLoaderData, useSearchParams } from "@remix-run/react";

const fsPromises = require("fs").promises;

export const meta: V2_MetaFunction = () => {
  return [{ title: "Dekoder" }];
};

// TODO: Fix underscore_case for all functions and variables.

// const TOTAL_TEAMS = 2;
// const TOTAL_TEAM_WORDS = 4;
// const TEAM_WORDS_PER_ROUND = 3;

function all_teams(): string[] {
  return ["red", "blue"];
}
function other_team(team: string): string {
  return team === "red" ? "blue" : "red";
}
function verify_team(team: string): string | undefined {
  return all_teams().includes(team) ? team : undefined;
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

function word_by_id(words: Word[], id: number): Word {
  return words.find((w) => w.word_id === id)!;
}

class Explanation {
  constructor(public word_id: number, public explanation: string) {}
}

class Summary {
  constructor(
    public word_id: number,
    public word: string,
    public explanations: string[]
  ) {}
}

function make_summaries(
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

enum RoundStage {
  Explain,
  Guess,
  Done,
}

function teamExplainedWords(team: string, round: Round): boolean {
  for (const item of round.teams[team]) {
    if (!item.explanation) {
      return false;
    }
  }
  return true;
}

function teamGuessedWords(team: string, round: Round): boolean {
  for (const anyTeam of all_teams()) {
    for (const item of round.teams[anyTeam]) {
      if (!item.guess?.[team]) {
        return false;
      }
    }
  }
  return true;
}

function getRoundStage(round: Round): RoundStage {
  if (!all_teams().every((team) => teamExplainedWords(team, round))) {
    return RoundStage.Explain;
  }
  if (!all_teams().every((team) => teamGuessedWords(team, round))) {
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
    public summaries: { [team: string]: Summary[] },
    public currentRound?: Round
  ) {}

  public static fromJson(json_text: string): GameData {
    const data = JSON.parse(json_text);
    // TODO: Construct summaries on the fly
    const summaries: any = {};
    for (const t of all_teams()) {
      summaries[t] = make_summaries(t, data.words[t], data.pastRounds);
    }
    return new GameData(
      data.words,
      data.pastRounds,
      summaries,
      data.currentRound
    );
  }

  public toJson(): string {
    const jsonObject = {
      words: this.words,
      pastRounds: this.pastRounds,
      currentRound: this.currentRound,
    };
    return JSON.stringify(jsonObject, null, 2);
  }
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
    return this.roundsByTeam(other_team(this.loginData.ourTeam));
  }
  public ourSummaries(): Summary[] {
    return this.gameData.summaries[this.loginData.ourTeam];
  }
  public theirSummaries(): Summary[] {
    return this.gameData.summaries[other_team(this.loginData.ourTeam)];
  }
}

const WideTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
    fontWeight: 700,
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
    width: 60,
  },
}));

const MyTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(even)": {
    backgroundColor: theme.palette.action.hover,
  },
  // TODO: hide last border when there is nothing below the table
  "&:last-child td, &:last-child th": {
    // border: 0,
  },
}));

function roundCard(round: PastRoundDisplay) {
  return (
    <Card key={round.round_id}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <MyTableRow>
              <WideTableCell>
                # {String(round.round_id).padStart(2, "0")}
              </WideTableCell>
              <NarrowTableCell align="center">❔</NarrowTableCell>
              <NarrowTableCell align="center">❕</NarrowTableCell>
            </MyTableRow>
          </TableHead>
          <TableBody>
            {round.items.map((item) => (
              <MyTableRow key={item.explanation}>
                <WideTableCell>{item.explanation}</WideTableCell>
                <NarrowTableCell align="center">{item.guess}</NarrowTableCell>
                <NarrowTableCell align="center">{item.answer}</NarrowTableCell>
              </MyTableRow>
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
            <MyTableRow>
              <WideTableCell>
                {/* TODO: Is it a good idea to show your words?
                    It increases the chance of exposing them accidentally */}
                {summary.word_id} {showWords ? summary.word : "🔮"}
              </WideTableCell>
            </MyTableRow>
          </TableHead>
          <TableBody>
            {summary.explanations.map((explanation) => (
              <MyTableRow key={explanation}>
                <WideTableCell>{explanation}</WideTableCell>
              </MyTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
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
              <MyTableRow key={w.word_id}>
                <NarrowTableCell
                  className={tableCellClasses.head}
                  align="center"
                >
                  {w.word_id}
                </NarrowTableCell>
                <WideTableCell>{w.word}</WideTableCell>
              </MyTableRow>
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
        <input type="hidden" name="team" value={ourTeam} />
        <TableContainer>
          <Table size="small">
            <TableBody>
              {wordsToExplain.map((w) => (
                <MyTableRow key={w.word_id}>
                  <NarrowTableCell
                    className={tableCellClasses.head}
                    align="center"
                  >
                    {w.word_id}
                  </NarrowTableCell>
                  <WideTableCell>
                    <input
                      style={{ width: "100%" }}
                      type="text"
                      name={`explanation-${w.word_id}`}
                    />
                  </WideTableCell>
                </MyTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box>
          {/* TODO: Align right */}
          <Button type="submit">Submit</Button>
        </Box>
      </Form>
    </Card>
  );
}

function waitingForExplanationsView() {
  return (
    <Card>
      <Typography variant="body2" m={1}>
        Waiting for explanations...
      </Typography>
    </Card>
  );
}

function enterGuessesView(ourTeam: string, explanations: Explanation[]) {
  return (
    <Card>
      <Form method="post" reloadDocument>
        <input type="hidden" name="team" value={ourTeam} />
        <TableContainer>
          <Table size="small">
            <TableBody>
              {explanations.map((e) => (
                <MyTableRow key={e.word_id}>
                  <WideTableCell>{e.explanation}</WideTableCell>
                  <NarrowishTableCell>
                    <input
                      style={{ width: "100%" }}
                      type="text"
                      name={`guess-${e.word_id}`}
                    />
                  </NarrowishTableCell>
                </MyTableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box>
          {/* TODO: Align right */}
          <Button type="submit">Submit</Button>
        </Box>
      </Form>
    </Card>
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

function MainView(clientData: ClientData, captainMode: boolean) {
  // TODO: Display overall stats (num white/black points per team).
  let dynamicContent = null;
  const ourTeam = clientData.loginData.ourTeam;
  const currentRound = clientData.currentRound();
  if (currentRound) {
    switch (getRoundStage(currentRound)) {
      case RoundStage.Explain: {
        if (teamExplainedWords(ourTeam, currentRound)) {
          dynamicContent = waitingForOpponentView();
        } else {
          if (captainMode) {
            const words = clientData.ourWords();
            const wordsToExplain = currentRound.teams[ourTeam].map((item) =>
              word_by_id(words, item.answer)
            );
            dynamicContent = enterExplanationsView(
              clientData.loginData.ourTeam,
              wordsToExplain
            );
          } else {
            dynamicContent = waitingForExplanationsView();
          }
        }
        break;
      }
      case RoundStage.Guess: {
        const explanations = currentRound.teams[ourTeam].map(
          (item) => new Explanation(item.answer, item.explanation!)
        );
        dynamicContent = enterGuessesView(
          clientData.loginData.ourTeam,
          explanations
        );
        break;
      }
      case RoundStage.Done: {
        dynamicContent = waitingForOpponentView();
        break;
      }
    }
  }
  return (
    <Stack spacing={2}>
      {ourWordsView(clientData.ourWords())}
      {dynamicContent}
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

export async function loader() {
  return await fsPromises.readFile("../game-data/current", "utf8");
}

export async function action({ request }: ActionArgs) {
  // TODO: Don't crash on bad data.
  const gameData = GameData.fromJson(
    await fsPromises.readFile("../game-data/current", "utf8")
  );
  const formData = await request.formData();

  // console.log("=== BEGIN ===");
  // for (var pair of formData.entries()) {
  //   console.log(pair[0] + ", " + pair[1]);
  // }
  // console.log("=== END ===");

  const currentRound = gameData.currentRound;
  if (currentRound) {
    const team = verify_team(formData.get("team")!.toString())!;
    switch (getRoundStage(currentRound)) {
      case RoundStage.Explain: {
        for (const item of currentRound.teams[team]) {
          item.explanation = formData
            .get(`explanation-${item.answer}`)!
            .toString();
        }
        break;
      }
      case RoundStage.Guess: {
        // ...
        break;
      }
      case RoundStage.Done: {
        // ...
        break;
      }
    }
  } else {
    // Game is over
  }
  await fsPromises.writeFile("../game-data/current", gameData.toJson(), "utf8");
  return json({ ok: true });
}

export default function Index() {
  const [searchParams, _setSearchParams] = useSearchParams();
  const loginData = new LoginData(searchParams.get("team")!);
  const gameData = GameData.fromJson(useLoaderData<typeof loader>());
  const [tabIndex, setTableIndex] = useState(0);
  const [captainMode, setCaptainMode] = useState(false);
  const clientData = new ClientData(loginData, gameData, captainMode);

  const body = {
    0: MainView(clientData, captainMode),
    1: RoundsView(clientData.ourRounds()),
    2: RoundsView(clientData.theirRounds()),
    3: SummariesView(clientData.ourSummaries(), true),
    4: SummariesView(clientData.theirSummaries(), false),
  }[tabIndex];

  return (
    <Container>
      <CssBaseline />
      <Container sx={{ pt: 2, pb: 9 }}>{body}</Container>
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
      {
        // TODO: Also check if it's relevant
        tabIndex == 0 && (
          <Fab
            color="primary"
            sx={{ position: "absolute", bottom: 84, right: 16 }}
            onClick={() => setCaptainMode(!captainMode)}
          >
            {captainMode ? <VisibilityIcon /> : <LockIcon />}
          </Fab>
        )
      }
    </Container>
  );
}
