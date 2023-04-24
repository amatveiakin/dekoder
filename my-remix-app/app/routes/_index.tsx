import { ActionArgs, V2_MetaFunction, json } from "@remix-run/node";
import React, { useState } from "react";
import CssBaseline from "@mui/material/CssBaseline";
// import logo from "./logo.svg";  // TODO: add favicon
import {
  BottomNavigation,
  BottomNavigationAction,
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
  styled,
  tableCellClasses,
} from "@mui/material";
import ViewListOutlinedIcon from "@mui/icons-material/ViewListOutlined";
import ViewListIcon from "@mui/icons-material/ViewList";
import SummarizeOutlinedIcon from "@mui/icons-material/SummarizeOutlined";
import SummarizeIcon from "@mui/icons-material/Summarize";
import EditIcon from "@mui/icons-material/Edit";
import { Form, useLoaderData } from "@remix-run/react";

const fsPromises = require("fs").promises;

export const meta: V2_MetaFunction = () => {
  return [{ title: "Dekoder" }];
};

// TODO: Display overall stats (num white/black points per team).

enum Team {
  Red,
  Blue,
}

function all_teams(): Team[] {
  return [Team.Red, Team.Blue];
}
function other_team(team: Team): Team {
  return team === Team.Red ? Team.Blue : Team.Red;
}

class RoundItem {
  constructor(
    public explanation: string,
    public guess: number,
    public answer: number
  ) {}
}

class Round {
  constructor(public round_id: number, public items: RoundItem[]) {}
}

class Word {
  constructor(public word_id: number, public word: string) {}
}

class Summary {
  constructor(public word_id: number, public explanations: string[]) {}
}

function make_summaries(words: Word[], rounds: Round[]): Summary[] {
  const summaries: Summary[] = [];
  for (const word of words) {
    const explanations: string[] = [];
    for (const round of rounds) {
      for (const item of round.items) {
        if (item.answer === word.word_id) {
          explanations.push(item.explanation);
        }
      }
    }
    summaries.push(new Summary(word.word_id, explanations));
  }
  return summaries;
}

class LoginData {
  constructor(public myTeam: Team) {}
}

class GameData {
  constructor(
    public words: Map<Team, Word[]>,
    public rounds: Map<Team, Round[]>,
    public summaries: Map<Team, Summary[]>
  ) {}

  public static fromJson(json_text: string): GameData {
    const json = JSON.parse(json_text);
    const words = new Map([
      [Team.Red, json.redWords as Word[]],
      [Team.Blue, json.blueWords as Word[]],
    ]);
    const rounds = new Map([
      [Team.Red, json.redRounds as Round[]],
      [Team.Blue, json.blueRounds as Round[]],
    ]);
    const summaries = new Map();
    for (const t of all_teams()) {
      summaries.set(t, make_summaries(words.get(t)!, rounds.get(t)!));
    }
    return new GameData(words, rounds, summaries);
  }

  public toJson(): string {
    const jsonObject = {
      redWords: this.words.get(Team.Red),
      blueWords: this.words.get(Team.Blue),
      redRounds: this.rounds.get(Team.Red),
      blueRounds: this.rounds.get(Team.Blue),
    };
    return JSON.stringify(jsonObject, null, 2);
  }
}

class ClientData {
  constructor(public loginData: LoginData, public gameData: GameData) {}

  public ourRounds(): Round[] {
    return this.gameData.rounds.get(this.loginData.myTeam)!;
  }
  public theirRounds(): Round[] {
    return this.gameData.rounds.get(other_team(this.loginData.myTeam))!;
  }
  public ourSummaries(): Summary[] {
    return this.gameData.summaries.get(this.loginData.myTeam)!;
  }
  public theirSummaries(): Summary[] {
    return this.gameData.summaries.get(other_team(this.loginData.myTeam))!;
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

const NarrowTableCell = styled(WideTableCell)(({ theme }) => ({
  "&": {
    width: 10,
  },
}));

const MyTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(even)": {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

function roundCard(round: Round) {
  return (
    <Card key={round.round_id}>
      <TableContainer component={Paper}>
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

function summaryCard(summary: Summary) {
  return (
    <Card key={summary.word_id}>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <MyTableRow>
              <WideTableCell>🔮 {summary.word_id}</WideTableCell>
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

function MainView(clientData: ClientData) {
  return (
    <Form method="post" reloadDocument>
      <input type="text" name="word" />
    </Form>
  );
}

function RoundsView(rounds: Round[]) {
  return <Stack spacing={2}>{rounds.map((r) => roundCard(r))}</Stack>;
}

function SummariesView(summaries: Summary[]) {
  return <Stack spacing={2}>{summaries.map((s) => summaryCard(s))}</Stack>;
}

export async function loader() {
  return await fsPromises.readFile("../game-data/current", "utf8");
}

export async function action({ request }: ActionArgs) {
  const data = GameData.fromJson(
    await fsPromises.readFile("../game-data/current", "utf8")
  );
  // TODO: ...
  const words = data.words.get(Team.Red)!;
  words.push(new Word(words.length + 1, "new word"));
  await fsPromises.writeFile("../game-data/current", data.toJson(), "utf8");
  return json({ ok: true });
}

export default function Index() {
  const loginData = new LoginData(Team.Red);
  const gameData = GameData.fromJson(useLoaderData<typeof loader>());
  const clientData = new ClientData(loginData, gameData);

  const [tabIndex, setTableIndex] = useState(0);
  const body = {
    0: MainView(clientData),
    1: RoundsView(clientData.ourRounds()),
    2: RoundsView(clientData.theirRounds()),
    3: SummariesView(clientData.ourSummaries()),
    4: SummariesView(clientData.theirSummaries()),
  }[tabIndex];

  return (
    <Container>
      <CssBaseline />
      {body}
      <Paper
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
        elevation={5}
      >
        <BottomNavigation
          value={tabIndex}
          onChange={(event, newValue) => {
            setTableIndex(newValue);
          }}
        >
          <BottomNavigationAction label="Current Round" icon={<EditIcon />} />
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
