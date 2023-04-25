import { useNavigate } from "@remix-run/react";
import { Box, Button, Stack, Typography } from "@mui/material";

export default function Index() {
  const navigate = useNavigate();

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
    >
      <Stack spacing={2} sx={{ width: 280 }}>
        <Typography variant="h6" align="center" sx={{ mb: 1 }}>
          Welcome to decoder online!
        </Typography>
        <Button variant="contained" size="large" onClick={() => {} /*TODO*/}>
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
    </Box>
  );
}
