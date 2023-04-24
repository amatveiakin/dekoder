import React from "react";
import CssBaseline from "@mui/material/CssBaseline";
// import logo from "./logo.svg";  // TODO: add favicon
import "./App.css";
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Card,
  Paper,
  Stack,
} from "@mui/material";
import MailIcon from "@mui/icons-material/Mail";
import MailOutlinedIcon from "@mui/icons-material/MailOutlined";

function App() {
  return (
    <Box>
      <CssBaseline />
      <Stack spacing={2}>
        <Card>Card 1</Card>
        <Card>Card 2</Card>
      </Stack>
      <Paper
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0 }}
        elevation={3}
      >
        <BottomNavigation
        //   showLabels
        //   value={value}
        //   onChange={(event, newValue) => {
        //     setValue(newValue);
        //   }}
        >
          <BottomNavigationAction
            label="Our rounds"
            icon={<MailOutlinedIcon />}
          />
          <BottomNavigationAction label="Their rounds" icon={<MailIcon />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
}

export default App;
