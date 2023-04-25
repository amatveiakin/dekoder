import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import CssBaseline from "@mui/material/CssBaseline";
import { type ThemeOptions, ThemeProvider, createTheme } from "@mui/material";

export default function App() {
  // Note. Don't set theme colors to red and blue (especially the primary color)
  // to avoid associations with red and blue teams.
  const themeOptions: ThemeOptions = {
    palette: {
      mode: "light",
      primary: {
        main: "#4b0082",
      },
      secondary: {
        main: "#ccad00",
      },
    },
  };
  const theme = createTheme(themeOptions);
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <CssBaseline />
        <ThemeProvider theme={theme}>
          <Outlet />
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
