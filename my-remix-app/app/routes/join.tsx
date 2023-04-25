import React, { useState } from "react";
import { useNavigate, useSearchParams } from "@remix-run/react";
import { Box, Button, Stack, TextField, ButtonGroup } from "@mui/material";

export default function Join() {
  const [searchParams, _setSearchParams] = useSearchParams();
  const [team, setTeam] = useState("red");
  const [gameId, setGameId] = useState(searchParams.get("gameId"));
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
    >
      {/* `useFlexGap` required to make child margins work */}
      <Stack useFlexGap spacing={2} sx={{ width: 280 }}>
        {/* TODO: Auto capitalize */}
        {/* TODO: Increase input test size; center input */}
        <TextField
          variant="outlined"
          fullWidth
          type="text"
          required
          autoComplete="off"
          name="gameId"
          label="Game ID"
          value={gameId}
          onChange={({ target }) => setGameId(target.value)}
        />
        <ButtonGroup variant="outlined">
          <Button
            variant={team === "red" ? "contained" : "outlined"}
            onClick={() => setTeam("red")}
            fullWidth
          >
            Team Red
          </Button>
          <Button
            variant={team === "blue" ? "contained" : "outlined"}
            onClick={() => setTeam("blue")}
            fullWidth
          >
            Team Blue
          </Button>
        </ButtonGroup>
        <Button
          variant="contained"
          size="large"
          sx={{ mt: 2 }}
          onClick={() => {
            navigate(`/game/${gameId}/${team}`, { replace: true });
          }}
        >
          Join as {team}!
        </Button>
      </Stack>
    </Box>
  );
}
