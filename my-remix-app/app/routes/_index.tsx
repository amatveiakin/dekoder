import type { V2_MetaFunction } from "@remix-run/node";
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
    private loginData: LoginData,
    private words: Map<Team, Word[]>,
    private rounds: Map<Team, Round[]>,
    private summaries: Map<Team, Summary[]>
  ) {}

  public static fromJson(loginData: LoginData, json_test: string): GameData {
    const json = JSON.parse(json_test);
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
    return new GameData(loginData, words, rounds, summaries);
  }

  public ourRounds(): Round[] {
    return this.rounds.get(this.loginData.myTeam)!;
  }
  public theirRounds(): Round[] {
    return this.rounds.get(other_team(this.loginData.myTeam))!;
  }
  public ourSummaries(): Summary[] {
    return this.summaries.get(this.loginData.myTeam)!;
  }
  public theirSummaries(): Summary[] {
    return this.summaries.get(other_team(this.loginData.myTeam))!;
  }
}

const sampleJson = `{
  "redWords": [
    {
      "word_id": 1,
      "word": "Lorem"
    },
    {
      "word_id": 2,
      "word": "ipsum"
    },
    {
      "word_id": 3,
      "word": "dolor"
    },
    {
      "word_id": 4,
      "word": "sit"
    }
  ],
  "blueWords": [
    {
      "word_id": 1,
      "word": "amet"
    },
    {
      "word_id": 2,
      "word": "consectetur"
    },
    {
      "word_id": 3,
      "word": "adipiscing"
    },
    {
      "word_id": 4,
      "word": "elit"
    }
  ],
  "redRounds": [
    {
      "round_id": 1,
      "items": [
        {
          "explanation": "Lorem ipsum",
          "guess": 4,
          "answer": 2
        },
        {
          "explanation": "dolor sit amet",
          "guess": 3,
          "answer": 3
        },
        {
          "explanation": "consectetur",
          "guess": 2,
          "answer": 4
        }
      ]
    },
    {
      "round_id": 2,
      "items": [
        {
          "explanation": "Cras justo dui",
          "guess": 1,
          "answer": 1
        },
        {
          "explanation": "maximus elementum ornare sed",
          "guess": 2,
          "answer": 2
        },
        {
          "explanation": "pretium ut magna",
          "guess": 4,
          "answer": 3
        }
      ]
    }
  ],
  "blueRounds": [
    {
      "round_id": 1,
      "items": [
        {
          "explanation": "Vivamus tincidunt",
          "guess": 4,
          "answer": 2
        },
        {
          "explanation": "rhoncus aliquam",
          "guess": 3,
          "answer": 3
        },
        {
          "explanation": "Ut in metus facilisis",
          "guess": 2,
          "answer": 4
        }
      ]
    }
  ]
}`;

const gameData = GameData.fromJson(new LoginData(Team.Red), sampleJson);

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

function RoundsView(rounds: Round[]) {
  return <Stack spacing={2}>{rounds.map((r) => roundCard(r))}</Stack>;
}

function SummariesView(summaries: Summary[]) {
  return <Stack spacing={2}>{summaries.map((s) => summaryCard(s))}</Stack>;
}

export default function Index() {
  const [tabIndex, setTableIndex] = useState(0);
  const body = {
    0: <div>Current Round</div>,
    1: RoundsView(gameData.ourRounds()),
    2: RoundsView(gameData.theirRounds()),
    3: SummariesView(gameData.ourSummaries()),
    4: SummariesView(gameData.theirSummaries()),
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
