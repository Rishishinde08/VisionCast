import React, { useState, useContext } from "react";
import {
  Avatar,
  Button,
  TextField,
  Box,
  Typography,
  Snackbar,
  CircularProgress,
  Paper,
  Stack,
  Fade,
} from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { AuthContext } from "../contexts/AuthContext";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#7c4dff",
    },
    secondary: {
      main: "#ff4081",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export default function Authentication() {
  const { handleRegister, handleLogin } = useContext(AuthContext);

  const [mode, setMode] = useState(0); // 0 = login, 1 = sign-up
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [toastOpen, setToastOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError("");
    setLoading(true);
    try {
      if (mode === 0) {
        await handleLogin(username, password);
      } else {
        const msg = await handleRegister(fullName, username, password);
        setToastMsg(msg || "Registered successfully!");
        setToastOpen(true);
        setMode(0);
        setFullName("");
        setUsername("");
        setPassword("");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err.message || "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at 10% 20%, #7c4dff 0%, transparent 20%), radial-gradient(circle at 90% 80%, #ff4081 0%, transparent 20%)",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(135deg, rgba(124, 77, 255, 0.1) 0%, rgba(255, 64, 129, 0.1) 100%)",
            zIndex: 1,
          },
        }}
      >
        {/* Floating animated particles */}
        {[...Array(12)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: i % 2 === 0 ? "#7c4dff" : "#ff4081",
              opacity: 0.6,
              zIndex: 2,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animation: `float 15s ease-in-out ${i * 0.5}s infinite`,
              "@keyframes float": {
                "0%": {
                  transform: "translateY(0) translateX(0)",
                  opacity: 0.6,
                },
                "50%": {
                  transform: `translateY(${Math.random() * 100 - 50}px) translateX(${
                    Math.random() * 100 - 50
                  }px)`,
                  opacity: 0.9,
                },
                "100%": {
                  transform: "translateY(0) translateX(0)",
                  opacity: 0.6,
                },
              },
            }}
          />
        ))}

        {/* Auth Form */}
        <Fade in timeout={800}>
          <Paper
            elevation={10}
            sx={{
              zIndex: 3,
              backdropFilter: "blur(16px)",
              backgroundColor: "rgba(30, 30, 30, 0.85)",
              padding: { xs: 3, sm: 4 },
              borderRadius: 4,
              width: 400,
              maxWidth: "90%",
              color: "#fff",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.36)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              transition: "all 0.3s ease",
              "&:hover": {
                boxShadow: "0 12px 40px rgba(0, 0, 0, 0.42)",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Avatar
                sx={{
                  m: 1,
                  bgcolor: "primary.main",
                  width: 56,
                  height: 56,
                  boxShadow: "0 4px 12px rgba(124, 77, 255, 0.4)",
                }}
              >
                <LockOutlinedIcon fontSize="medium" />
              </Avatar>
              <Typography
                variant="h5"
                gutterBottom
                sx={{ fontWeight: 600, mt: 1 }}
              >
                {mode === 0 ? "Welcome Back" : "Create Account"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 3 }}
              >
                {mode === 0
                  ? "Sign in to continue to your account"
                  : "Join us today to get started"}
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mb: 3, width: "100%" }}>
                <Button
                  fullWidth
                  variant={mode === 0 ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setMode(0)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    py: 1,
                  }}
                >
                  Login
                </Button>
                <Button
                  fullWidth
                  variant={mode === 1 ? "contained" : "outlined"}
                  color="primary"
                  onClick={() => setMode(1)}
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    py: 1,
                  }}
                >
                  Register
                </Button>
              </Stack>

              {mode === 1 && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": {
                        borderColor: "rgba(255, 255, 255, 0.23)",
                      },
                      "&:hover fieldset": {
                        borderColor: "primary.main",
                      },
                    },
                  }}
                />
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "rgba(255, 255, 255, 0.23)",
                    },
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                  },
                }}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": {
                      borderColor: "rgba(255, 255, 255, 0.23)",
                    },
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                  },
                }}
              />

              {error && (
                <Typography
                  color="error"
                  variant="body2"
                  sx={{ mt: 1, width: "100%" }}
                >
                  ⚠️ {error}
                </Typography>
              )}

              <Button
                fullWidth
                variant="contained"
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  letterSpacing: 0.5,
                  background:
                    "linear-gradient(45deg, #7c4dff 0%, #ff4081 100%)",
                  boxShadow: "0 4px 12px rgba(124, 77, 255, 0.3)",
                  "&:hover": {
                    boxShadow: "0 6px 16px rgba(124, 77, 255, 0.4)",
                  },
                }}
                onClick={submit}
                disabled={loading}
              >
                {loading ? (
                  <CircularProgress size={24} sx={{ color: "white" }} />
                ) : mode === 0 ? (
                  "Sign In"
                ) : (
                  "Sign Up"
                )}
              </Button>
            </Box>
          </Paper>
        </Fade>

        <Snackbar
          open={toastOpen}
          autoHideDuration={4000}
          onClose={() => setToastOpen(false)}
          message={toastMsg}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          ContentProps={{
            sx: {
              background: "linear-gradient(45deg, #7c4dff 0%, #ff4081 100%)",
              fontWeight: 600,
            },
          }}
        />
      </Box>
    </ThemeProvider>
  );
}