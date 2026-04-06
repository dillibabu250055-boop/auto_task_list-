import React, { useState } from "react";
import axios from "axios";
import { useGoogleLogin } from "@react-oauth/google";
import {
  Box,
  Container,
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  AppBar,
  Toolbar,
  InputAdornment,
  Switch,
  FormControlLabel,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import SecurityIcon from "@mui/icons-material/Security";

const Login = ({ onLoginSuccess }) => {
  // Login/Register tabs
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState("info");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [view, setView] = useState("AUTH"); // AUTH, FORGOT, RESET

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setMessage(null);
      try {
        const response = await axios.post("http://localhost:8080/api/auth/google", {
          code: tokenResponse.code,
        });

        if (response.data.success) {
          setMessageType("success");
          setMessage("✅ Google Login successful! Redirecting...");
          localStorage.setItem("user", JSON.stringify(response.data.user));
          setTimeout(() => {
            onLoginSuccess(response.data.user);
          }, 1500);
        }
      } catch (error) {
        setMessageType("error");
        const errorMsg = error.response?.data?.message || "Google login failed.";
        setMessage(`❌ ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      setMessageType("error");
      setMessage("❌ Google Login failed. Please try again.");
    },
    flow: "auth-code",
    scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly",
  });

  // Login state
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  // Register state
  const [registerData, setRegisterData] = useState({
    email: "",
    name: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    role: "STUDENT",
    yearOfStudy: 1,
    course: "B.Tech",
    department: "CSC",
    registerNumber: "",
    position: "",
    collegeType: "Rajalakshmi Institute of Technology",
    gmailAppPassword: "",
    syncGmail: false,
  });

  const departments = ["CSC", "ECE", "AIDS", "AIML", "BIOTECH", "VLSI", "CCE", "CSBS"];
  const courses = ["B.E", "B.Tech"];
  const positions = [
    "Professor",
    "Associate Professor",
    "Assistant Professor",
    "Lecturer",
    "Assistant",
    "HOD",
    "Principal",
    "Administrator",
  ];

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post("http://localhost:8080/api/auth/login", loginData);

      if (response.data.success) {
        setMessageType("success");
        setMessage("✅ Login successful! Redirecting...");
        localStorage.setItem("user", JSON.stringify(response.data.user));
        setTimeout(() => {
          onLoginSuccess(response.data.user);
        }, 1500);
      }
    } catch (error) {
      setMessageType("error");
      const errorMsg = error.response?.data?.message || "Login failed. Please try again.";
      setMessage(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle register
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Validation
    if (!registerData.email || !registerData.name || !registerData.password) {
      setMessageType("error");
      setMessage("❌ Please fill in all required fields");
      setLoading(false);
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      setMessageType("error");
      setMessage("❌ Passwords do not match");
      setLoading(false);
      return;
    }

    if (!registerData.email.includes("@")) {
      setMessageType("error");
      setMessage("❌ Please enter a valid email address");
      setLoading(false);
      return;
    }

    // Validate phone number for students
    if (registerData.role === "STUDENT" && !registerData.phoneNumber) {
      setMessageType("error");
      setMessage("❌ Phone number is required for students");
      setLoading(false);
      return;
    }

    // Validate register number for students (must be 13 characters)
    if (registerData.role === "STUDENT") {
      if (!registerData.registerNumber) {
        setMessageType("error");
        setMessage("❌ Register number is required for students");
        setLoading(false);
        return;
      }
      if (registerData.registerNumber.length !== 13) {
        setMessageType("error");
        setMessage("❌ Register number must be exactly 13 characters");
        setLoading(false);
        return;
      }
    }

    try {
      // Submit registration data as JSON
      const submitData = {
        email: registerData.email,
        name: registerData.name,
        password: registerData.password,
        role: registerData.role,
        phoneNumber: registerData.phoneNumber,
        gmailAppPassword: registerData.gmailAppPassword,
        collegeType: registerData.collegeType,
        ...(registerData.role === "STUDENT" && {
          yearOfStudy: registerData.yearOfStudy,
          course: registerData.course,
          department: registerData.department,
          registerNumber: registerData.registerNumber,
        }),
        ...(registerData.role === "STAFF" && {
          position: registerData.position,
        }),
      };

      const response = await axios.post(
        "http://localhost:8080/api/auth/register",
        submitData
      );

      if (response.data.success) {
        setMessageType("success");
        const baseMsg = "✅ Registration successful!";
        
        // If Gmail sync is enabled, trigger email sync
        if (registerData.syncGmail && registerData.gmailAppPassword) {
          setMessage(`${baseMsg} Syncing your Gmail emails...`);
          // TODO: Call Gmail sync endpoint with the registered user's email
          // This will be implemented in the backend with TaskController
        } else {
          setMessage(`${baseMsg} Login with your credentials.`);
        }
        
        // Auto-fill login form
        setLoginData({
          email: registerData.email,
          password: registerData.password,
        });

        // Switch to login tab after 2 seconds
        setTimeout(() => {
          setActiveTab(0);
          setRegisterData({
            email: "",
            name: "",
            password: "",
            confirmPassword: "",
            phoneNumber: "",
            registerNumber: "",
            gmailAppPassword: "",
            syncGmail: false,
            role: "STUDENT",
            yearOfStudy: 1,
            course: "B.Tech",
            department: "CSC",
            position: "",
            collegeType: "Rajalakshmi Institute of Technology",
          });
        }, 2000);
      }
    } catch (error) {
      setMessageType("error");
      const errorMsg = error.response?.data?.message || "Registration failed. Please try again.";
      setMessage(`❌ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post("http://localhost:8080/api/auth/forgot-password", {
        email: forgotPasswordEmail,
      });

      if (response.data.success) {
        setMessageType("success");
        setMessage(`✅ ${response.data.message}`);
        // For hackathon/demo, we auto-transition to reset if we have the token
        if (response.data.token) {
          setResetToken(response.data.token);
          setTimeout(() => setView("RESET"), 2000);
        }
      }
    } catch (error) {
      setMessageType("error");
      setMessage(`❌ ${error.response?.data?.message || "Error sending reset link"}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      setMessageType("error");
      setMessage("❌ Passwords do not match");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await axios.post("http://localhost:8080/api/auth/reset-password", {
        token: resetToken,
        password: newPassword,
      });

      if (response.data.success) {
        setMessageType("success");
        setMessage("✅ Password reset successful! You can now login.");
        setTimeout(() => setView("AUTH"), 2000);
      }
    } catch (error) {
      setMessageType("error");
      setMessage(`❌ ${error.response?.data?.message || "Error resetting password"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", justifyContent: "center", alignItems: "center" }}>
      <Card
        sx={{
          display: "flex",
          width: "900px",
          height: "600px",
          borderRadius: "5px",
          overflow: "hidden",
          boxShadow: "0 0 100px rgba(0, 123, 255, 0.4)",
        }}
      >
        {/* Left IMS Branding Section */}
        <Box
          sx={{
            width: "45%",
            background: "linear-gradient(160deg, #1a3a6e 0%, #255497 60%, #1e4080 100%)",
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "32px",
            position: "relative",
            "&::after": {
              content: '""',
              position: "absolute",
              right: "-15px",
              top: 0,
              bottom: 0,
              width: "30px",
              background: "linear-gradient(160deg, #1a3a6e 0%, #255497 60%, #1e4080 100%)",
              transform: "skewX(-4deg)",
              zIndex: 1,
            }
          }}
        >
          {/* College Logo with glowing badge */}
          <Box
            sx={{
              zIndex: 2,
              mb: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              bgcolor: "white",
              overflow: "hidden",
              boxShadow: "0 0 0 4px rgba(255,255,255,0.5), 0 8px 32px rgba(0,0,0,0.4)",
              p: 1,
            }}
          >
            <Box
              component="img"
              src="/rit-logo.png"
              alt="Rajalakshmi Institute of Technology Logo"
              sx={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
              onError={(e) => { e.target.style.display = "none"; }}
            />
          </Box>

          {/* Institution Name */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              textAlign: "center",
              mb: 0.5,
              zIndex: 2,
              letterSpacing: "1px",
              textTransform: "uppercase",
              lineHeight: 1.4,
              color: "#ffffff",
              textShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            Rajalakshmi Institute
          </Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              textAlign: "center",
              mb: 1.5,
              zIndex: 2,
              letterSpacing: "1px",
              textTransform: "uppercase",
              lineHeight: 1.4,
              color: "#ffffff",
              textShadow: "0 2px 8px rgba(0,0,0,0.4)",
            }}
          >
            of Technology
          </Typography>

          {/* Divider */}
          <Box sx={{ width: "55px", height: "3px", bgcolor: "rgba(255,255,255,0.7)", borderRadius: "2px", mb: 2, zIndex: 2 }} />

          {/* Subtitle */}
          <Typography
            variant="body1"
            sx={{
              textAlign: "center",
              lineHeight: 1.7,
              zIndex: 2,
              color: "#ffffff",
              fontWeight: 700,
              letterSpacing: "0.5px",
              textShadow: "0 1px 6px rgba(0,0,0,0.5)",
            }}
          >
            Intelligent Workflow Organizer
          </Typography>

          {/* Badge */}
          <Box
            sx={{
              mt: 2,
              zIndex: 2,
              bgcolor: "rgba(255,255,255,0.25)",
              border: "1.5px solid rgba(255,255,255,0.7)",
              borderRadius: "20px",
              px: 2.5,
              py: 0.6,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                letterSpacing: "2.5px",
                fontWeight: 800,
                textTransform: "uppercase",
                color: "#ffffff",
                fontSize: "0.72rem",
              }}
            >
              AUTO TASK MANAGER
            </Typography>
          </Box>
        </Box>

        {/* Right Form Section */}
        <Box
          sx={{
            width: { xs: "100%", md: "55%" },
            bgcolor: "background.paper",
            position: "relative",
            zIndex: 2,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CardContent sx={{ padding: "40px 50px", flexGrow: 1, overflowY: "auto" }}>
            {/* Message Alert */}
            {message && (
              <Alert
                severity={messageType}
                sx={{ marginBottom: "20px", fontSize: "0.95rem" }}
                onClose={() => setMessage(null)}
              >
                {message}
              </Alert>
            )}

            {view === "AUTH" && (
              <>
            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{
                marginBottom: "30px",
                borderBottom: "2px solid #ddd",
                "& .MuiTab-root": {
                  fontSize: "1rem",
                  fontWeight: "bold",
                  color: "text.primary",
                },
                "& .Mui-selected": {
                  color: "#007bff !important",
                },
              }}
            >
              <Tab label="🔐 Login" icon={<LockIcon />} iconPosition="start" />
              <Tab label="📝 Sign Up" icon={<PersonIcon />} iconPosition="start" />
            </Tabs>

            {/* LOGIN TAB */}
            {activeTab === 0 && (
              <Box component="form" onSubmit={handleLogin}>
                <Typography variant="h5" sx={{ marginBottom: "25px", fontWeight: "bold", color: "text.primary" }}>
                  Sign In to Your Account
                </Typography>

                <TextField
                  fullWidth
                  label="College Email"
                  type="email"
                  placeholder="your.name@college.edu"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  margin="normal"
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: "primary.main" }} />
                      </InputAdornment>
                    ),
                    sx: { color: "text.primary", fontWeight: 500 }
                  }}
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  margin="normal"
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: "primary.main" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: "primary.main" }}
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </Button>
                      </InputAdornment>
                    ),
                    sx: { color: "text.primary", fontWeight: 500 }
                  }}
                  variant="outlined"
                />

                <Box sx={{ display: "flex", justifyContent: "flex-end", marginTop: "5px" }}>
                  <Button
                    size="small"
                    onClick={() => setView("FORGOT")}
                    sx={{ color: "primary.main", textTransform: "none", fontWeight: "bold" }}
                  >
                    Forgot Password?
                  </Button>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={{
                    marginTop: "25px",
                    padding: "12px",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    borderRadius: "6px",
                    bgcolor: "#007bff",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(0,123,255,0.35)",
                    "&:hover": {
                      bgcolor: "#0069d9",
                    },
                    "&.Mui-disabled": {
                      bgcolor: "#2575fc",
                      color: "#ffffff",
                      opacity: 0.8,
                    },
                  }}
                  onClick={handleLogin}
                  disabled={loading || !loginData.email || !loginData.password}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockIcon />}
                >
                  {loading ? "Logging in..." : "Login"}
                </Button>

                <Box sx={{ position: "relative", marginY: "25px", textAlign: "center" }}>
                  <Box sx={{ position: "absolute", top: "50%", left: 0, right: 0, height: "1px", backgroundColor: "#ccc", zIndex: 0 }} />
                  <Typography variant="body2" sx={{ position: "relative", display: "inline-block", padding: "0 15px", backgroundColor: "background.paper", color: "text.primary", fontWeight: "bold", zIndex: 1 }}>
                    OR
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  size="large"
                  onClick={() => googleLogin()}
                  disabled={loading}
                  sx={{
                    padding: "10px",
                    fontWeight: "bold",
                    color: "text.primary",
                    borderColor: "#333",
                    textTransform: "none",
                    fontSize: "1rem",
                    "&:hover": {
                      backgroundColor: "#f0f0f0",
                      borderColor: "#111",
                    },
                  }}
                  startIcon={<Box component="img" src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" sx={{ width: 22, height: 22 }} />}
                >
                  Sign in with Google
                </Button>



                <Typography variant="body2" sx={{ marginTop: "15px", textAlign: "center", color: "text.primary" }}>
                  Don't have an account?{" "}
                  <Button
                    size="small"
                    onClick={() => setActiveTab(1)}
                    sx={{ color: "#007bff", fontWeight: "bold" }}
                  >
                    Register here
                  </Button>
                </Typography>
              </Box>
            )}

            {/* REGISTER TAB */}
            {activeTab === 1 && (
              <Box component="form" onSubmit={handleRegister}>
                <Typography variant="h6" sx={{ marginBottom: "20px", fontWeight: "bold" }}>
                  Create Your Account
                </Typography>

                <TextField
                  fullWidth
                  label="Full Name"
                  placeholder="John Doe"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                  margin="normal"
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: "primary.main" }} />
                      </InputAdornment>
                    ),
                    sx: { color: "text.primary", fontWeight: 500 }
                  }}
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Phone Number"
                  type="tel"
                  placeholder="9876543210"
                  value={registerData.phoneNumber}
                  onChange={(e) => setRegisterData({ ...registerData, phoneNumber: e.target.value })}
                  margin="normal"
                  disabled={loading}
                  InputProps={{
                    sx: { color: "text.primary", fontWeight: 500 }
                  }}
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="College Email"
                  type="email"
                  placeholder="your.name@college.edu"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  margin="normal"
                  disabled={loading}
                  helperText="Use your official college email"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: "primary.main" }} />
                      </InputAdornment>
                    ),
                    sx: { color: "text.primary", fontWeight: 500 }
                  }}
                  variant="outlined"
                />

                <FormControl fullWidth margin="normal" disabled={loading}>
                  <InputLabel>User Type</InputLabel>
                  <Select
                    value={registerData.role}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, role: e.target.value })
                    }
                    label="User Type"
                  >
                    <MenuItem value="STUDENT">👨‍🎓 Student</MenuItem>
                    <MenuItem value="STAFF">👨‍🏫 Staff/Faculty</MenuItem>
                  </Select>
                </FormControl>

                {/* Student Fields */}
                {registerData.role === "STUDENT" && (
                  <Box sx={{ marginTop: "15px", padding: "15px", bgcolor: "background.default", border: "1px solid", borderColor: "success.main", borderRadius: "8px" }}>
                    <Typography variant="body2" sx={{ fontWeight: "bold", marginBottom: "15px", color: "success.main" }}>
                      📚 Student Information
                    </Typography>

                    <TextField
                      fullWidth
                      label="Register Number"
                      placeholder="REG20240001ABC"
                      value={registerData.registerNumber}
                      onChange={(e) => setRegisterData({ ...registerData, registerNumber: e.target.value.toUpperCase() })}
                      margin="normal"
                      disabled={loading}
                      helperText={`Register number must be exactly 13 characters (${registerData.registerNumber.length}/13)`}
                      error={registerData.registerNumber.length > 0 && registerData.registerNumber.length !== 13}
                      InputProps={{
                        sx: { color: "text.primary", fontWeight: 500 }
                      }}
                      variant="outlined"
                    />

                    <FormControl fullWidth margin="normal" disabled={loading}>
                      <InputLabel>Department</InputLabel>
                      <Select
                        value={registerData.department}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, department: e.target.value })
                        }
                        label="Department"
                      >
                        {departments.map((dept) => (
                          <MenuItem key={dept} value={dept}>
                            {dept}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth margin="normal" disabled={loading}>
                      <InputLabel>Course</InputLabel>
                      <Select
                        value={registerData.course}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, course: e.target.value })
                        }
                        label="Course"
                      >
                        {courses.map((course) => (
                          <MenuItem key={course} value={course}>
                            {course}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth margin="normal" disabled={loading}>
                      <InputLabel>Year of Study</InputLabel>
                      <Select
                        value={registerData.yearOfStudy}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, yearOfStudy: e.target.value })
                        }
                        label="Year of Study"
                      >
                        <MenuItem value={1}>1st Year</MenuItem>
                        <MenuItem value={2}>2nd Year</MenuItem>
                        <MenuItem value={3}>3rd Year</MenuItem>
                        <MenuItem value={4}>4th Year</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {/* Staff Fields */}
                {registerData.role === "STAFF" && (
                  <Box sx={{ marginTop: "15px", padding: "15px", bgcolor: "background.default", border: "1px solid", borderColor: "info.main", borderRadius: "8px" }}>
                    <Typography variant="body2" sx={{ fontWeight: "bold", marginBottom: "15px", color: "info.main" }}>
                      👔 Staff Information
                    </Typography>

                    <FormControl fullWidth margin="normal" disabled={loading}>
                      <InputLabel>Position</InputLabel>
                      <Select
                        value={registerData.position}
                        onChange={(e) =>
                          setRegisterData({ ...registerData, position: e.target.value })
                        }
                        label="Position"
                      >
                        {positions.map((pos) => (
                          <MenuItem key={pos} value={pos}>
                            {pos}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  margin="normal"
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: "primary.main" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: "primary.main" }}
                        >
                          {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                        </Button>
                      </InputAdornment>
                    ),
                    sx: { color: "text.primary", fontWeight: 500 }
                  }}
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Confirm Password"
                  type={showPassword ? "text" : "password"}
                  value={registerData.confirmPassword}
                  onChange={(e) =>
                    setRegisterData({ ...registerData, confirmPassword: e.target.value })
                  }
                  margin="normal"
                  disabled={loading}
                  error={registerData.password !== registerData.confirmPassword && registerData.confirmPassword !== ""}
                  helperText={
                    registerData.password !== registerData.confirmPassword && registerData.confirmPassword !== ""
                      ? "Passwords do not match"
                      : ""
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: "primary.main" }} />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                />

                {/* Google Integration Section */}
                <Box sx={{ marginTop: "20px", padding: "20px", textAlign: "center", bgcolor: "background.default", borderRadius: "12px", border: "1px dashed", borderColor: "divider" }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold", marginBottom: "15px", color: "text.primary" }}>
                    🚀 Quick Registration with Google
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => googleLogin()}
                    disabled={loading}
                    sx={{
                      bgcolor: "background.paper",
                      color: "text.primary",
                      borderColor: "divider",
                      textTransform: "none",
                      fontWeight: "500",
                      padding: "8px 16px",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "text.secondary"
                      }
                    }}
                    startIcon={<Box component="img" src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg" sx={{ width: 20, height: 20 }} />}
                  >
                    Link Google Account for Email Sync
                  </Button>
                  <Typography variant="caption" sx={{ display: "block", marginTop: "10px", color: "text.secondary" }}>
                    Required for converting Gmail emails into tasks automatically.
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{
                    marginTop: "25px",
                    padding: "12px",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    bgcolor: "#007bff",
                    color: "white",
                    borderRadius: "0px",
                    "&:hover": {
                      backgroundColor: "#0069d9",
                    },
                  }}
                  onClick={handleRegister}
                  disabled={
                    loading ||
                    !registerData.email ||
                    !registerData.name ||
                    !registerData.password ||
                    !registerData.confirmPassword
                  }
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PersonIcon />}
                >
                  {loading ? "Registering..." : "Sign Up"}
                </Button>

                <Typography variant="body2" sx={{ marginTop: "15px", textAlign: "center", color: "#666" }}>
                  Already have an account?{" "}
                  <Button
                    size="small"
                    onClick={() => setActiveTab(0)}
                    sx={{ color: "primary.main", fontWeight: "bold" }}
                  >
                    Login here
                  </Button>
                </Typography>
              </Box>
            )}
            </>
            )}

            {/* FORGOT PASSWORD VIEW */}
            {view === "FORGOT" && (
              <Box component="form" onSubmit={handleForgotPassword}>
                <Typography variant="h5" sx={{ marginBottom: "15px", fontWeight: "bold" }}>
                  Forgot Password?
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: "25px", color: "#666" }}>
                  Enter your college email address and we'll send you instructions to reset your password.
                </Typography>

                <TextField
                  fullWidth
                  label="College Email"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  margin="normal"
                  disabled={loading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: "primary.main" }} />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                />

                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ marginTop: "25px", padding: "12px", fontWeight: "bold" }}
                  onClick={handleForgotPassword}
                  disabled={loading || !forgotPasswordEmail}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <Button
                  fullWidth
                  variant="text"
                  sx={{ marginTop: "15px", color: "#666" }}
                  onClick={() => setView("AUTH")}
                >
                  Back to Login
                </Button>
              </Box>
            )}

            {/* RESET PASSWORD VIEW */}
            {view === "RESET" && (
              <Box component="form" onSubmit={handleResetPassword}>
                <Typography variant="h5" sx={{ marginBottom: "15px", fontWeight: "bold" }}>
                  Reset Password
                </Typography>
                <Typography variant="body2" sx={{ marginBottom: "25px", color: "#666" }}>
                  Please enter your new password below.
                </Typography>

                <TextField
                  fullWidth
                  label="Reset Token"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  margin="normal"
                  disabled={loading}
                  helperText="Enter the token sent to your email"
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  margin="normal"
                  disabled={loading}
                  variant="outlined"
                />

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  margin="normal"
                  disabled={loading}
                  error={newPassword !== confirmNewPassword && confirmNewPassword !== ""}
                  variant="outlined"
                />

                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ marginTop: "25px", padding: "12px", fontWeight: "bold" }}
                  onClick={handleResetPassword}
                  disabled={loading || !resetToken || !newPassword || newPassword !== confirmNewPassword}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LockIcon />}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </Box>
            )}
          </CardContent>
        </Box>
      </Card>
    </Box>
  );
};

export default Login;
