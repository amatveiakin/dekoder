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

class RoundLine {
  constructor(
    public explanation: string,
    public guess: number,
    public answer: number
  ) {}
}

class Round {
  constructor(public id: number, public lines: RoundLine[]) {}
}

const ourRounds = [
  new Round(1, [
    new RoundLine("Lorem ipsum", 4, 2),
    new RoundLine("dolor sit amet", 3, 3),
    new RoundLine("consectetur", 2, 4),
  ]),
  new Round(2, [
    new RoundLine("Cras justo dui", 1, 1),
    new RoundLine("maximus elementum ornare sed", 2, 2),
    new RoundLine("pretium ut magna", 4, 3),
  ]),
];

const theirRounds = [
  new Round(1, [
    new RoundLine("Vivamus tincidunt", 4, 2),
    new RoundLine("rhoncus aliquam", 3, 3),
    new RoundLine("Ut in metus facilisis", 2, 4),
  ]),
];

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
    <Card>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <RoundTableRow>
              <RoundTableCell># {r.id}</RoundTableCell>
              <RoundTableCell align="center">❔</RoundTableCell>
              <RoundTableCell align="center">❕</RoundTableCell>
            </RoundTableRow>
          </TableHead>
          <TableBody>
            {r.lines.map((row) => (
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
    1: RoundHistory(ourRounds),
    2: RoundHistory(theirRounds),
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
