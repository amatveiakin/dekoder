import { Form, useNavigate } from "@remix-run/react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { redirect } from "@remix-run/node";
import {
  GameData,
  gameDataToJson,
  gameFile,
  randomChoice,
  allTeams,
  randomChoiceString,
  TOTAL_TEAM_WORDS,
  postprocessGameData,
  Word,
} from "~/common";

const fs = require("fs");
const fsPromises = require("fs").promises;

function randomGameId() {
  // Skip confusing letters (I ~ l,1; O ~ 0):
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array(4)
    .fill(undefined)
    .map(() => randomChoiceString(alphabet))
    .join("");
}

export async function action() {
  const allWords = (
    await fsPromises.readFile("../server-assets/words.txt", "utf8")
  ).split("\n");
  const gameData = new GameData({}, [], undefined);
  // TODO: Make sure all words are unique.
  for (const team of allTeams()) {
    gameData.words[team] = Array.from(
      { length: TOTAL_TEAM_WORDS },
      (_, i) => new Word(i + 1, randomChoice(allWords))
    );
  }
  postprocessGameData(gameData);

  while (true) {
    const gameId = randomGameId();
    const filename = gameFile(gameId);
    // TODO: Combine existance check and file write into an atomic operation
    // to avoid race condition.
    if (!fs.existsSync(filename)) {
      await fsPromises.writeFile(
        gameFile(gameId),
        gameDataToJson(gameData),
        "utf8"
      );
      return redirect(`/join?gameId=${gameId}`);
    }
  }
}

export default function Index() {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
    >
      <Form method="post">
        <Stack spacing={2} sx={{ width: 280 }}>
          <Typography variant="h6" align="center" sx={{ mb: 1 }}>
            Welcome to decoder online!
          </Typography>
          <Button variant="contained" size="large" type="submit">
            New game
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate("/join")}
          >
            Join game
          </Button>
        </Stack>
      </Form>
    </Box>
  );
}
