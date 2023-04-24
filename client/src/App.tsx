import React, { useState } from "react";
import CssBaseline from "@mui/material/CssBaseline";
// import logo from "./logo.svg";  // TODO: add favicon
import "./App.css";
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

// TODO: Display overall stats (num white/black points per team).

enum Team {
  Red,
  Blue,
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

class Summary {
  constructor(public word_id: number, public explanations: string[]) {}
}

class LoginData {
  constructor(public myTeam: Team) {}
}

class GameData {
  constructor(
    private loginData: LoginData,
    private words: Map<Team, string[]>,
    private rounds: Map<Team, Round[]>,
    private summaries: Map<Team, Summary[]>
  ) {}

  public static fromJson(loginData: LoginData, json_test: string): GameData {
    const json = JSON.parse(json_test);
    const words = new Map([
      [Team.Red, json.redWords],
      [Team.Blue, json.blueWords],
    ]);
    const rounds = new Map([
      [Team.Red, json.redRounds],
      [Team.Blue, json.blueRounds],
    ]);
    // TODO: Summaries
    return new GameData(loginData, words, rounds, new Map());
  }

  public ourRounds(): Round[] {
    return this.rounds.get(this.loginData.myTeam)!;
  }
  public theirRounds(): Round[] {
    return this.rounds.get(other_team(this.loginData.myTeam))!;
  }
}

const sampleJson = `{
  "redWords": ["Lorem", "ipsum", "dolor", "sit"],
  "blueWords": ["amet", "consectetur", "adipiscing", "elit"],
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

const RoundTableCell = styled(TableCell)(({ theme }) => ({
  "&:nth-child(n+2)": {
    width: 10,
  },
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.common.black,
    color: theme.palette.common.white,
    fontWeight: 700,
  },
  [`&.${tableCellClasses.body}`]: {},
}));

const RoundTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(even)": {
    backgroundColor: theme.palette.action.hover,
  },
  // hide last border
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

function roundCard(r: Round) {
  return (
    <Card key={r.round_id}>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <RoundTableRow>
              <RoundTableCell># {r.round_id}</RoundTableCell>
              <RoundTableCell align="center">❔</RoundTableCell>
              <RoundTableCell align="center">❕</RoundTableCell>
            </RoundTableRow>
          </TableHead>
          <TableBody>
            {r.items.map((row) => (
              <RoundTableRow key={row.explanation}>
                <RoundTableCell>{row.explanation}</RoundTableCell>
                <RoundTableCell align="center">{row.guess}</RoundTableCell>
                <RoundTableCell align="center">{row.answer}</RoundTableCell>
              </RoundTableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

function RoundHistory(rounds: Round[]) {
  return <Stack spacing={2}>{rounds.map((r) => roundCard(r))}</Stack>;
}

function App() {
  const [tabIndex, setTableIndex] = useState(0);
  const body = {
    0: <div>Current Round</div>,
    1: RoundHistory(gameData.ourRounds()),
    2: RoundHistory(gameData.theirRounds()),
    3: <div>Our Summary</div>,
    4: <div>Their Summary</div>,
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

export default App;
