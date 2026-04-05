import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
    const storedTheme = localStorage.getItem("darkMode");
    if (storedTheme === "true") setDarkMode(true);
    setLoading(false);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem("darkMode", !darkMode);
  };

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      primary: { main: darkMode ? "#60a5fa" : "#1565C0" }, // a nice light blue in dark mode
      secondary: { main: "#ff9800" },
      background: {
        default: darkMode ? "#0B1120" : "#f0f2f5", // sleek midnight blue
        paper: darkMode ? "#111827" : "#ffffff", // tailwind gray-900
      }
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: "none", // Avoid default MUI dark mode elevation blending
          }
        }
      }
    }
  });

  if (loading) return <div>Loading...</div>;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ fontFamily: "Inter, Arial, sans-serif", minHeight: "100vh" }}>
        {!user ? (
          <Login onLoginSuccess={setUser} />
        ) : (
          <Dashboard user={user} onLogout={() => setUser(null)} darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;