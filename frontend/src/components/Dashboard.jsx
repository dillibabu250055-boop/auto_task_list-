import React, { useEffect, useState } from "react";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Container,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  IconButton,
  Divider,
  Stepper,
  Step,
  StepLabel,
  AppBar,
  Toolbar,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Snackbar,
  Tooltip,
} from "@mui/material";
import EmailIcon from "@mui/icons-material/Email";
import SyncIcon from "@mui/icons-material/Sync";
import RefreshIcon from "@mui/icons-material/Refresh";
import DeleteIcon from "@mui/icons-material/Delete";
import InfoIcon from "@mui/icons-material/Info";
import SettingsIcon from "@mui/icons-material/Settings";
import HelpIcon from "@mui/icons-material/Help";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import WarningIcon from "@mui/icons-material/Warning";
import OpenInBrowserIcon from "@mui/icons-material/OpenInBrowser";
import EditIcon from "@mui/icons-material/Edit";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ClockIcon from "@mui/icons-material/Schedule";
import ProfileIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import CalendarView from "./CalendarView";

const Dashboard = ({ user, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState(0);
  const [error, setError] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [bgSyncNotify, setBgSyncNotify] = useState(false);
  const [openEmailDialog, setOpenEmailDialog] = useState(false);
  const [openSettingsDialog, setOpenSettingsDialog] = useState(false);
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
  const [openEmailInfo, setOpenEmailInfo] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [setupStep, setSetupStep] = useState(0);
  const [emailCredentials, setEmailCredentials] = useState({
    email: "",
    appPassword: "",
    rememberPassword: false,
  });
  const [filterAccount, setFilterAccount] = useState("all");
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [syncMessage, setSyncMessage] = useState(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [syncProgress, setSyncProgress] = useState("Initializing...");
  const [isSyncing, setIsSyncing] = useState(false);
  
  // New state for task management
  const [openEditPriorityDialog, setOpenEditPriorityDialog] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingPriority, setEditingPriority] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);
  const [deadlineNotifications, setDeadlineNotifications] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  
  // Profile management
  const [openProfileDialog, setOpenProfileDialog] = useState(false);

  // Load tasks and saved accounts on component mount
  useEffect(() => {
    loadTasks();
    loadSavedAccounts();
  }, []);

  // Check for deadline notifications whenever tasks change
  useEffect(() => {
    checkDeadlineNotifications();
  }, [tasks]);

  const loadSavedAccounts = () => {
    const saved = localStorage.getItem("gmailAccounts");
    if (saved) {
      setSavedAccounts(JSON.parse(saved));
      // Auto-fill first saved account email
      const accounts = JSON.parse(saved);
      if (accounts.length > 0) {
        setEmailCredentials({
          email: accounts[0].email,
          appPassword: "",
        });
      }
    }
  };

  const saveAccount = (email) => {
    const accounts = JSON.parse(localStorage.getItem("gmailAccounts") || "[]");
    if (!accounts.find((acc) => acc.email === email)) {
      accounts.push({ email, addedDate: new Date().toLocaleDateString() });
      localStorage.setItem("gmailAccounts", JSON.stringify(accounts));
      setSavedAccounts(accounts);
      setSetupStep(0);
    }
  };

  const removeAccount = async (email) => {
    try {
      // Also remove tasks from backend for this email
      await axios.delete(`http://localhost:8080/api/tasks/synced-by/${email}`);
      
      const accounts = savedAccounts.filter((acc) => acc.email !== email);
      localStorage.setItem("gmailAccounts", JSON.stringify(accounts));
      setSavedAccounts(accounts);
      if (emailCredentials.email === email) {
        setEmailCredentials({ email: "", appPassword: "" });
      }
      
      // Refresh tasks list
      loadTasks();
    } catch (error) {
      console.error("Failed to remove account tasks:", error);
      alert("Account removed from settings, but failed to clear tasks from database.");
    }
  };

  const handleOpenDeleteConfirm = (email) => {
    setAccountToDelete(email);
    setOpenDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (accountToDelete) {
      removeAccount(accountToDelete);
      setOpenDeleteConfirm(false);
      setAccountToDelete(null);
    }
  };

  const handleCloseDeleteConfirm = () => {
    setOpenDeleteConfirm(false);
    setAccountToDelete(null);
  };

  const handleOpenEmailInfo = (account) => {
    setSelectedAccount(account);
    setOpenEmailInfo(true);
  };

  const handleCloseEmailInfo = () => {
    setOpenEmailInfo(false);
    setSelectedAccount(null);
  };

  const loadTasks = () => {
    setLoading(true);
    axios
      .get("http://localhost:8080/api/tasks")
      .then((response) => {
        setTasks(response.data);
        setError(null);
      })
      .catch((error) => {
        console.error(error);
        setError(
          "Failed to load tasks. Make sure the backend is running on http://localhost:8080"
        );
      })
      .finally(() => setLoading(false));
  };

  // Check for deadline notifications
  const checkDeadlineNotifications = () => {
    if (tasks.length === 0) return;
    
    const now = new Date();
    const notifications = [];
    
    tasks.forEach((task) => {
      if (task.status === "COMPLETED") return; // Skip completed tasks
      
      if (!task.deadline) return;
      
      const deadline = new Date(task.deadline);
      const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
      
      // Notify if deadline is today, tomorrow, or overdue
      if (daysUntilDeadline <= 1 && daysUntilDeadline >= -7) {
        let message = "";
        if (daysUntilDeadline < 0) {
          message = `⚠️ OVERDUE: "${task.title}" was due ${Math.abs(daysUntilDeadline)} days ago!`;
        } else if (daysUntilDeadline === 0) {
          message = `🔴 TODAY: "${task.title}" is due today!`;
        } else if (daysUntilDeadline === 1) {
          message = `🟡 TOMORROW: "${task.title}" is due tomorrow!`;
        }
        notifications.push({ taskId: task.id, message, deadline });
      }
    });
    
    setDeadlineNotifications(notifications);
    if (notifications.length > 0) {
      setNotificationMessage(notifications[0].message);
      setShowNotification(true);
    }
  };

  // Get deadline status (OVERDUE, TODAY, TOMORROW, UPCOMING)
  const getDeadlineStatus = (deadline, status) => {
    if (status === "COMPLETED") return "DONE";
    if (!deadline) return "NO_DEADLINE";
    
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntil = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntil < 0) return "OVERDUE";
    if (daysUntil === 0) return "TODAY";
    if (daysUntil === 1) return "TOMORROW";
    if (daysUntil <= 7) return "WEEK";
    return "UPCOMING";
  };

  // Handle Drag and Drop
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskId = parseInt(draggableId);
    const newStatus = destination.droppableId;
    
    // Optimistic UI update
    const updatedTasks = [...tasks];
    const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
      updatedTasks[taskIndex].status = newStatus;
      setTasks(updatedTasks);
    }

    try {
      setUpdatingTaskId(taskId);
      const taskToUpdate = tasks.find(t => t.id === taskId);
      const updatedTask = { ...taskToUpdate, status: newStatus };
      
      await axios.put(`http://localhost:8080/api/tasks/${taskId}`, updatedTask);
      
      setNotificationMessage(`✅ Task moved to ${newStatus.toLowerCase()}`);
      setShowNotification(true);
      checkDeadlineNotifications();
    } catch (error) {
      console.error("Error updating task status:", error);
      // Revert on error
      loadTasks();
      setNotificationMessage("❌ Failed to move task");
      setShowNotification(true);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getTasksByStatus = (status) => {
    let filteredTasks = tasks.filter(task => task.status === status);
    if (filterAccount !== "all") {
      filteredTasks = filteredTasks.filter(task => task.syncedByEmail === filterAccount);
    }
    return filteredTasks;
  };

  // Open priority edit dialog
  const handleOpenEditPriorityDialog = (task) => {
    setEditingTaskId(task.id);
    setEditingPriority(task.priority);
    setOpenEditPriorityDialog(true);
  };

  // Update task priority
  const handleUpdatePriority = async () => {
    if (!editingTaskId) return;
    
    setUpdatingTaskId(editingTaskId);
    try {
      const taskToUpdate = tasks.find(t => t.id === editingTaskId);
      const updatedTask = { ...taskToUpdate, priority: editingPriority };
      
      await axios.put(`http://localhost:8080/api/tasks/${editingTaskId}`, updatedTask);
      
      setTasks(tasks.map(t => t.id === editingTaskId ? { ...t, priority: editingPriority } : t));
      
      setOpenEditPriorityDialog(false);
      setEditingTaskId(null);
      setEditingPriority("");
      
      setNotificationMessage(`✅ Priority updated to ${editingPriority}`);
      setShowNotification(true);
    } catch (error) {
      console.error("Error updating priority:", error);
      setNotificationMessage("❌ Failed to update priority");
      setShowNotification(true);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleOpenEmailDialog = () => {
    setOpenEmailDialog(true);
    setSyncMessage(null);
  };

  const handleCloseEmailDialog = () => {
    setOpenEmailDialog(false);
    setEmailCredentials({ ...emailCredentials, appPassword: "" });
    setSyncMessage(null);
  };

  const handleOpenSettingsDialog = () => {
    setOpenSettingsDialog(true);
    setActiveTab(0);
    setSetupStep(0);
    // Reload saved accounts to ensure they're up to date
    loadSavedAccounts();
  };

  const handleCloseSettingsDialog = () => {
    setOpenSettingsDialog(false);
    setActiveTab(0);
    setSetupStep(0);
  };

  const handleSyncEmails = async () => {
    // If user has Google Access Token, use it instead of App Password
    const useOAuth = user && user.googleAccessToken;

    if (!useOAuth && (!emailCredentials.email || !emailCredentials.appPassword)) {
      setSyncMessage("Please enter both email and app password");
      setSyncSuccess(false);
      return;
    }

    setSyncLoading(true);
    setIsSyncing(true);
    setSyncSuccess(false);
    setSyncProgress(useOAuth ? "🔐 Connecting via Google OAuth..." : "🔐 Connecting to Gmail...");

    try {
      setSyncProgress("📨 Fetching recent emails...");
      
      let response;
      if (useOAuth) {
        response = await axios.post(
          "http://localhost:8080/api/auth/google-sync",
          { 
            accessToken: user.googleAccessToken,
            email: user.email 
          },
          { timeout: 90000 }
        );
      } else {
        response = await axios.post(
          "http://localhost:8080/api/tasks/sync-emails",
          emailCredentials,
          { timeout: 90000 }
        );
      }

      if (response.data.success) {
        setSyncProgress(`✓ Processing complete! Added ${response.data.tasksCount || response.data.tasks?.length} new tasks`);
        setSyncMessage(
          `✓ ${response.data.message}`
        );
        setSyncSuccess(true);
        if (response.data.backgroundSync) {
            setBgSyncNotify(true);
        }
        
        if (!useOAuth) {
            saveAccount(emailCredentials.email);
            setEmailCredentials({ ...emailCredentials, appPassword: "" });
        }
        
        // Reload tasks once after sync
        setTimeout(() => {
          loadTasks();
          handleCloseEmailDialog();
          setSyncProgress("Initializing...");
        }, 1500); 
      }
    } catch (error) {
      let errorMsg = "Failed to sync emails. Check your credentials and try again.";
      
      if (error.code === 'ECONNABORTED') {
        errorMsg = "⏱️ Sync timed out. Try again or check your settings.";
      } else if (error.response?.data?.message) {
        errorMsg = error.response.data.message;
      }
      
      setSyncMessage("Error: " + errorMsg);
      setSyncSuccess(false);
      setSyncProgress("❌ Sync failed");
      console.error("Sync error:", error);
    } finally {
      setSyncLoading(false);
      setIsSyncing(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "HIGH":
        return "#ff4d4d"; // Red
      case "MEDIUM":
        return "#ffcc00"; // Yellow
      case "LOW":
        return "#4CAF50"; // Green
      default:
        return "#ccc";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "#4CAF50"; // Green
      case "APPROVED":
        return "#2196F3"; // Blue
      case "PENDING":
        return "#ff9800"; // Orange
      default:
        return "#9e9e9e";
    }
  };

  const isEmailSourced = (task) => {
    return task.senderEmail && task.senderEmail.includes("@");
  };

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f0f2f5" }}>
      {/* Professional Header */}
      <AppBar position="static" sx={{ backgroundColor: "#1565C0", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <Toolbar>
          <Box
            component="img"
            src="/rit-logo.svg"
            alt="RIT Logo"
            sx={{
              height: "45px",
              width: "auto",
              marginRight: "15px",
              objectFit: "contain",
            }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 0.3 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold", lineHeight: 1 }}>
              Rajalakshmi Institute of Technology
            </Typography>
            <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>
              Email Task Manager
            </Typography>
          </Box>
          
          {/* User Profile Section */}
          {user && (
            <Box sx={{ display: "flex", alignItems: "center", gap: "15px", marginLeft: "20px" }}>
              <Button
                color="inherit"
                startIcon={<ProfileIcon />}
                onClick={() => setOpenProfileDialog(true)}
                sx={{
                  textAlign: "left",
                  "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold" }}>{user.name}</Typography>
                  <Typography variant="caption" sx={{ fontSize: "0.7rem" }}>
                    {user.role === "STUDENT" ? `${user.department} - Year ${user.yearOfStudy}` : user.position}
                  </Typography>
                </Box>
              </Button>
              <Divider orientation="vertical" variant="middle" sx={{ height: "30px", backgroundColor: "rgba(255,255,255,0.3)" }} />
            </Box>
          )}
          
          <Box sx={{ display: "flex", gap: "10px" }}>
            <Button
              color="inherit"
              startIcon={<RefreshIcon />}
              onClick={loadTasks}
              disabled={loading}
              sx={{
                "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
              }}
            >
              Refresh
            </Button>
            <Button
              color="inherit"
              startIcon={<SettingsIcon />}
              onClick={handleOpenSettingsDialog}
              sx={{
                "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
              }}
            >
              Settings
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<SyncIcon />}
              onClick={handleOpenEmailDialog}
              sx={{
                backgroundColor: "#43a047",
                "&:hover": { backgroundColor: "#388e40" },
                fontWeight: "bold",
              }}
            >
              Sync Emails
            </Button>
            <Button
              color="inherit"
              startIcon={<LogoutIcon />}
              onClick={() => {
                localStorage.removeItem("user");
                onLogout();
              }}
              sx={{
                "&:hover": { backgroundColor: "rgba(255,255,255,0.2)" },
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" style={{ marginTop: "30px", marginBottom: "40px" }}>
        
        {/* Navigation Tabs */}
        <Paper square sx={{ mb: 3, borderRadius: 1, overflow: "hidden" }}>
          <Tabs 
            value={activeMainTab} 
            onChange={(e, val) => setActiveMainTab(val)}
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab icon={<TaskAltIcon />} iconPosition="start" label="Task List" sx={{ fontSize: "1rem", fontWeight: "bold", minWidth: 200 }} />
            <Tab icon={<CalendarMonthIcon />} iconPosition="start" label="Upcoming Events (Calendar)" sx={{ fontSize: "1rem", fontWeight: "bold", minWidth: 250 }} />
          </Tabs>
        </Paper>

        {activeMainTab === 0 ? (
          // DASHBOARD TASK LIST VIEW
          <>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1565C0" }}>
                  My Tasks
                </Typography>
                
                {savedAccounts.length > 0 && (
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel id="account-filter-label">Filter Account</InputLabel>
                    <Select
                      labelId="account-filter-label"
                      value={filterAccount}
                      label="Filter Account"
                      onChange={(e) => setFilterAccount(e.target.value)}
                      sx={{ borderRadius: 2 }}
                    >
                      <MenuItem value="all"><em>Show All Accounts</em></MenuItem>
                      {savedAccounts.map((acc) => (
                        <MenuItem key={acc.email} value={acc.email}>{acc.email}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
              
              <Chip 
                label={filterAccount === "all" ? `${tasks.length} Total` : `${tasks.filter(t => t.syncedByEmail === filterAccount).length} Tasks (${filterAccount})`} 
                color="primary" 
                variant="outlined" 
                sx={{ fontWeight: "bold" }} 
              />
            </Box>
            
            {loading && (
              <Box sx={{ display: "flex", justifyContent: "center", my: 10 }}>
                <CircularProgress size={60} thickness={4} />
              </Box>
            )}

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {!loading && !error && tasks.length === 0 && (
              <Paper sx={{ p: 5, textAlign: "center", borderRadius: 2 }}>
                <InfoIcon sx={{ fontSize: 60, color: "#ccc", mb: 2 }} />
                <Typography variant="h6">No tasks found yet.</Typography>
                <Typography color="textSecondary">Try syncing your emails to generate tasks automatically!</Typography>
              </Paper>
            )}
            {!loading && !error && tasks.length > 0 && (
                <DragDropContext onDragEnd={onDragEnd}>
                  <Grid container spacing={3}>
                    {[
                      { id: "PENDING", title: "📝 To Do", color: "#ff9800" },
                      { id: "APPROVED", title: "🚀 In Progress", color: "#2196F3" },
                      { id: "COMPLETED", title: "✅ Done", color: "#4CAF50" },
                    ].map((column) => (
                      <Grid item xs={12} md={4} key={column.id}>
                        <Paper
                          sx={{
                            p: 2,
                            height: "100%",
                            minHeight: "500px",
                            backgroundColor: "#f5f5f5",
                            borderRadius: "12px",
                            borderTop: `4px solid ${column.color}`,
                          }}
                        >
                          <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            {column.title}
                            <Chip label={getTasksByStatus(column.id).length} size="small" />
                          </Typography>
                          
                          <Droppable droppableId={column.id}>
                            {(provided, snapshot) => (
                              <Box
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                sx={{
                                  minHeight: "450px",
                                  transition: "background-color 0.2s ease",
                                  backgroundColor: snapshot.isDraggingOver ? "rgba(0,0,0,0.02)" : "transparent",
                                }}
                              >
                                {getTasksByStatus(column.id).map((task, index) => (
                                  <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                    {(provided, snapshot) => (
                                      <Card
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        sx={{
                                          mb: 2,
                                          boxShadow: snapshot.isDragging ? "0 8px 20px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.05)",
                                          borderLeft: `5px solid ${getPriorityColor(task.priority)}`,
                                          transition: "all 0.2s ease",
                                          "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.1)" },
                                        }}
                                      >
                                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1, alignItems: "center" }}>
                                            <Chip 
                                              label={task.priority} 
                                              size="small" 
                                              sx={{ 
                                                height: "20px",
                                                fontSize: "0.65rem",
                                                bgcolor: getPriorityColor(task.priority), 
                                                color: "white", 
                                                fontWeight: "bold" 
                                              }} 
                                            />
                                            {isEmailSourced(task) && (
                                              <Box sx={{ display: "flex", gap: 0.5 }}>
                                                <Chip 
                                                  icon={<EmailIcon sx={{ fontSize: "0.8rem !important" }} />}
                                                  label="Email" 
                                                  size="small"
                                                  variant="outlined"
                                                  sx={{ height: "20px", fontSize: "0.65rem" }}
                                                />
                                                {filterAccount === "all" && task.syncedByEmail && (
                                                  <Tooltip title={`Synced from: ${task.syncedByEmail}`}>
                                                    <Chip 
                                                      label={task.syncedByEmail.split('@')[0]} 
                                                      size="small"
                                                      variant="contained"
                                                      sx={{ height: "20px", fontSize: "0.6rem", bgcolor: "#e3f2fd", color: "#1976d2" }}
                                                    />
                                                  </Tooltip>
                                                )}
                                              </Box>
                                            )}
                                          </Box>
                                          
                                          <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1, lineHeight: 1.3 }}>
                                            {task.title}
                                          </Typography>
                                          
                                          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                            {task.description}
                                          </Typography>
                                          
                                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                                            <ClockIcon sx={{ fontSize: "0.9rem" }} color="action" />
                                            <Typography variant="caption" sx={{ fontWeight: "bold", color: "#666" }}>
                                              {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No Deadline'}
                                            </Typography>
                                          </Box>

                                          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                                            <IconButton size="small" onClick={() => handleOpenEditPriorityDialog(task)}>
                                              <EditIcon fontSize="small" />
                                            </IconButton>
                                          </Box>
                                        </CardContent>
                                      </Card>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </Box>
                            )}
                          </Droppable>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </DragDropContext>
            )}
          </>
        ) : (
          // CALENDAR VIEW (Upcoming Events)
          <>
             <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: "bold", color: "#1565C0" }}>
                Upcoming Events Calendar
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Tasks positioned by deadline with priority-based highlights
              </Typography>
            </Box>
            <CalendarView tasks={tasks} />
          </>
        )}

      {/* Email Sync Dialog */}
      <Dialog
        open={openEmailDialog}
        onClose={handleCloseEmailDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <SyncIcon />
          Sync Tasks from Gmail
        </DialogTitle>
        <DialogContent sx={{ paddingTop: "20px" }}>
              {savedAccounts.length === 0 ? (
                <Alert severity="info" sx={{ marginBottom: "15px" }}>
                  💡 Tip: Sync your first email to save your Gmail account for quick access!
                </Alert>
              ) : (
                <Box sx={{ marginBottom: "20px" }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold", marginBottom: "10px", color: "#666" }}>
                    📧 Your Saved Accounts:
                  </Typography>
                  <Box sx={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "15px" }}>
                    {savedAccounts.map((acc) => (
                      <Chip
                        key={acc.email}
                        label={acc.email}
                        onClick={() =>
                          setEmailCredentials({
                            ...emailCredentials,
                            email: acc.email,
                          })
                        }
                        variant={
                          emailCredentials.email === acc.email
                            ? "filled"
                            : "outlined"
                        }
                        color={
                          emailCredentials.email === acc.email
                            ? "primary"
                            : "default"
                        }
                        icon={
                          emailCredentials.email === acc.email ? (
                            <CheckCircleIcon />
                          ) : undefined
                        }
                        sx={{ 
                          cursor: "pointer", 
                          padding: "20px 8px",
                          fontSize: "0.9rem",
                          fontWeight: emailCredentials.email === acc.email ? "bold" : "normal"
                        }}
                      />
                    ))}
                  </Box>
                  {emailCredentials.email ? (
                    <Alert severity="success" sx={{ marginBottom: "15px" }}>
                      ✓ Account selected: <strong>{emailCredentials.email}</strong>
                    </Alert>
                  ) : (
                    <Alert severity="info" sx={{ marginBottom: "15px" }}>
                      Click an account above to select it
                    </Alert>
                  )}
                </Box>
              )}

          <Alert severity="info" sx={{ marginBottom: "15px" }}>
            🔒 <strong>Enter your app password:</strong> Required for every sync. NOT stored locally.
          </Alert>

          <Box sx={{ marginBottom: "15px" }}>
            <Typography variant="body2" sx={{ fontWeight: "bold", marginBottom: "8px", color: "#333" }}>
              📧 Email Address:
            </Typography>
            <TextField
              fullWidth
              label="Gmail Address"
              type="email"
              value={emailCredentials.email}
              onChange={(e) =>
                setEmailCredentials({ ...emailCredentials, email: e.target.value })
              }
              placeholder="your.email@gmail.com"
              disabled={syncLoading}
              helperText={emailCredentials.email ? "✓ Ready to sync" : "Enter or select from saved accounts above"}
              variant="outlined"
            />
          </Box>

          <Box sx={{ marginBottom: "15px" }}>
            <Typography variant="body2" sx={{ fontWeight: "bold", marginBottom: "8px", color: "#333" }}>
              🔐 App Password:
            </Typography>
            <TextField
              fullWidth
              label="App Password"
              type="password"
              value={emailCredentials.appPassword}
              onChange={(e) =>
                setEmailCredentials({
                  ...emailCredentials,
                  appPassword: e.target.value,
                })
              }
              placeholder="xxxx xxxx xxxx xxxx"
              disabled={syncLoading}
              helperText="This is NOT saved. You'll need to enter it for each sync."
              variant="outlined"
            />
          </Box>

          <Button
            fullWidth
            startIcon={<HelpIcon />}
            color="info"
            variant="outlined"
            onClick={handleOpenSettingsDialog}
            sx={{ marginTop: "10px", marginBottom: "20px" }}
          >
            📚 Need help? View setup guide
          </Button>

          {isSyncing && (
            <Box sx={{ 
              marginTop: "15px", 
              padding: "15px", 
              backgroundColor: "#e3f2fd", 
              borderRadius: "8px",
              borderLeft: "4px solid #1976d2"
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <CircularProgress size={24} color="inherit" />
                <Typography variant="body2" sx={{ fontWeight: "bold", color: "#1565C0" }}>
                  {syncProgress}
                </Typography>
              </Box>
              <Typography variant="caption" color="textSecondary">
                ⏱️ Processing emails faster with optimized syncing (up to 50 recent emails, both read & unread)
              </Typography>
            </Box>
          )}

          {syncMessage && (
            <Alert
              severity={syncSuccess ? "success" : "error"}
              sx={{ marginTop: "15px" }}
            >
              {syncMessage}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseEmailDialog}
            disabled={syncLoading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSyncEmails}
            disabled={syncLoading || !emailCredentials.email}
            variant="contained"
            color="primary"
            startIcon={
              syncLoading ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <SyncIcon />
              )
            }
          >
            {syncLoading ? "Syncing..." : "Sync Now"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Settings Dialog with Tabs */}
      <Dialog
        open={openSettingsDialog}
        onClose={handleCloseSettingsDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Gmail Account Settings & Setup Guide</DialogTitle>
        <DialogContent sx={{ paddingTop: "20px" }}>
          <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
            <Tab label="📧 My Accounts" />
            <Tab label="🚀 Setup Guide" />
          </Tabs>

          {/* Tab 1: My Accounts */}
          {activeTab === 0 && (
            <Box sx={{ marginTop: "20px" }}>
              <Typography variant="h6" sx={{ marginBottom: "20px", fontWeight: "bold" }}>
                📧 Saved Gmail Accounts
              </Typography>

              {savedAccounts.length === 0 ? (
                <Alert severity="info">
                  <Typography variant="body2">
                    ℹ️ No accounts saved yet. Sync your first email to save an account!
                  </Typography>
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {savedAccounts.map((acc) => (
                    <Grid size={{ xs: 12 }} key={acc.email}>
                      <Paper
                        sx={{
                          padding: "15px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          backgroundColor: "#fafafa",
                          border: "1px solid #e0e0e0",
                          borderRadius: "8px",
                          "&:hover": {
                            backgroundColor: "#f5f5f5",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                          },
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: "15px", flex: 1 }}>
                          <EmailIcon sx={{ color: "#1565C0", fontSize: 28 }} />
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                              {acc.email}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Added: {acc.addedDate}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: "flex", gap: "8px" }}>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<InfoIcon />}
                            onClick={() => handleOpenEmailInfo(acc)}
                            sx={{
                              color: "#1565C0",
                              borderColor: "#1565C0",
                              "&:hover": {
                                backgroundColor: "#e3f2fd",
                              },
                            }}
                          >
                            Info
                          </Button>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DeleteIcon />}
                            color="error"
                            onClick={() => handleOpenDeleteConfirm(acc.email)}
                            sx={{
                              borderColor: "#f44336",
                              "&:hover": {
                                backgroundColor: "#ffebee",
                              },
                            }}
                          >
                            Remove
                          </Button>
                        </Box>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Box>
          )}

          {/* Tab 2: Setup Guide */}
          {activeTab === 1 && (
            <Box sx={{ marginTop: "20px" }}>
              <Stepper activeStep={setupStep} orientation="vertical">
                {/* Step 1 */}
                <Step>
                  <StepLabel>Enable 2-Factor Authentication</StepLabel>
                  <Box sx={{ paddingLeft: "40px", marginBottom: "20px" }}>
                    <Typography variant="body2">
                      1. Go to{" "}
                      <strong>
                        <a
                          href="https://myaccount.google.com/security"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Google Account Security
                        </a>
                      </strong>
                    </Typography>
                    <Typography variant="body2">
                      2. Click "2-Step Verification"
                    </Typography>
                    <Typography variant="body2">
                      3. Follow the instructions and turn it ON
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setSetupStep(1)}
                      sx={{ marginTop: "10px" }}
                    >
                      Next ➜
                    </Button>
                  </Box>
                </Step>

                {/* Step 2 */}
                <Step>
                  <StepLabel>Generate App Password</StepLabel>
                  <Box sx={{ paddingLeft: "40px", marginBottom: "20px" }}>
                    <Typography variant="body2">
                      1. Go to{" "}
                      <strong>
                        <a
                          href="https://myaccount.google.com/security"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Google Account Security
                        </a>
                      </strong>
                    </Typography>
                    <Typography variant="body2">
                      2. Scroll down to "App passwords"
                    </Typography>
                    <Typography variant="body2">
                      3. Select: Mail + Windows Computer
                    </Typography>
                    <Typography variant="body2">
                      4. Copy the <strong>16-character password</strong>
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setSetupStep(2)}
                      sx={{ marginTop: "10px" }}
                    >
                      Next ➜
                    </Button>
                  </Box>
                </Step>

                {/* Step 3 */}
                <Step>
                  <StepLabel>Get OpenAI API Key (Optional)</StepLabel>
                  <Box sx={{ paddingLeft: "40px", marginBottom: "20px" }}>
                    <Typography variant="body2">
                      1. Go to{" "}
                      <strong>
                        <a
                          href="https://platform.openai.com"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          OpenAI Platform
                        </a>
                      </strong>
                    </Typography>
                    <Typography variant="body2">
                      2. Sign up or login
                    </Typography>
                    <Typography variant="body2">
                      3. Go to "API keys"
                    </Typography>
                    <Typography variant="body2">
                      4. Click "Create new secret key"
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      💡 Optional: Better email parsing with AI
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setSetupStep(3)}
                      sx={{ marginTop: "10px" }}
                    >
                      Next ➜
                    </Button>
                  </Box>
                </Step>

                {/* Step 4 */}
                <Step>
                  <StepLabel>Start Using Dashboard</StepLabel>
                  <Box sx={{ paddingLeft: "40px", marginBottom: "20px" }}>
                    <Typography variant="body2">
                      1. Click "Sync Gmail Tasks" button
                    </Typography>
                    <Typography variant="body2">
                      2. Enter your Gmail address
                    </Typography>
                    <Typography variant="body2">
                      3. Paste the 16-character app password
                    </Typography>
                    <Typography variant="body2">
                      4. Click "Sync Now"
                    </Typography>
                    <Typography variant="body2" sx={{ marginTop: "10px" }}>
                      ✅ Your tasks will appear on the dashboard!
                    </Typography>
                  </Box>
                </Step>
              </Stepper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSettingsDialog} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteConfirm}
        onClose={handleCloseDeleteConfirm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "10px", color: "#f44336" }}>
          <WarningIcon />
          Remove Gmail Account?
        </DialogTitle>
        <DialogContent sx={{ paddingTop: "20px" }}>
          <Alert severity="warning" sx={{ marginBottom: "15px" }}>
            ⚠️ This will remove <strong>{accountToDelete}</strong> from your saved accounts.
          </Alert>
          <Typography variant="body2">
            You can always add it back later by syncing emails again. This does NOT affect your Gmail account.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteConfirm} variant="outlined">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
          >
            Remove Account
          </Button>
        </DialogActions>
      </Dialog>

      {/* Email Info Dialog */}
      <Dialog
        open={openEmailInfo}
        onClose={handleCloseEmailInfo}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#e3f2fd", borderBottom: "2px solid #1565C0" }}>
          <EmailIcon sx={{ color: "#1565C0" }} />
          Email Account Information
        </DialogTitle>
        <DialogContent sx={{ paddingTop: "20px" }}>
          {savedAccounts.length === 0 ? (
            <Alert severity="info" sx={{ marginBottom: "20px" }}>
              💡 <strong>No saved accounts yet!</strong> Sync your first email to save your Gmail account for quick access.
            </Alert>
          ) : (
            <Box>
              <Typography variant="h6" sx={{ marginBottom: "15px", fontWeight: "bold" }}>
                📧 Your Saved Accounts:
              </Typography>
              <Box sx={{ marginBottom: "20px" }}>
                {savedAccounts.map((acc) => (
                  <Box
                    key={acc.email}
                    sx={{
                      padding: "12px",
                      marginBottom: "10px",
                      backgroundColor: selectedAccount?.email === acc.email ? "#e3f2fd" : "#f5f5f5",
                      borderRadius: "8px",
                      border: selectedAccount?.email === acc.email ? "2px solid #1565C0" : "2px solid #e0e0e0",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        backgroundColor: "#e3f2fd",
                        borderColor: "#1565C0",
                      },
                    }}
                    onClick={() => setSelectedAccount(acc)}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
                          {acc.email}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          Added: {acc.addedDate}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        startIcon={<DeleteIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setAccountToDelete(acc);
                          setOpenDeleteConfirm(true);
                        }}
                      >
                        Remove
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
              <Divider sx={{ marginY: "20px" }} />
            </Box>
          )}
          {selectedAccount && (
            <Box>
              <Alert severity="info" sx={{ marginBottom: "20px" }}>
                📧 <strong>Email:</strong> {selectedAccount.email}
              </Alert>

              <Typography variant="h6" sx={{ marginBottom: "15px", fontWeight: "bold" }}>
                🔗 Quick Actions:
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    justifyContent: "flex-start",
                    padding: "12px",
                    color: "#1565C0",
                    borderColor: "#1565C0",
                    "&:hover": {
                      backgroundColor: "#e3f2fd",
                    },
                  }}
                >
                  Open Gmail Inbox
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    justifyContent: "flex-start",
                    padding: "12px",
                    color: "#1565C0",
                    borderColor: "#1565C0",
                    "&:hover": {
                      backgroundColor: "#e3f2fd",
                    },
                  }}
                >
                  Google Security Settings
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<OpenInNewIcon />}
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    justifyContent: "flex-start",
                    padding: "12px",
                    color: "#1565C0",
                    borderColor: "#1565C0",
                    "&:hover": {
                      backgroundColor: "#e3f2fd",
                    },
                  }}
                >
                  Manage App Passwords
                </Button>
              </Box>

              <Divider sx={{ marginY: "20px" }} />

              <Typography variant="body2" color="textSecondary">
                💡 <strong>Tip:</strong> Click the above links to:
              </Typography>
              <ul style={{ marginTop: "10px", paddingLeft: "20px", color: "#666", fontSize: "14px" }}>
                <li>Check your email inbox directly in Gmail</li>
                <li>Update your security settings and 2FA</li>
                <li>Revoke or create new app passwords</li>
              </ul>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmailInfo} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Priority Dialog */}
      <Dialog
        open={openEditPriorityDialog}
        onClose={() => setOpenEditPriorityDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <EditIcon />
          Update Task Priority
        </DialogTitle>
        <DialogContent sx={{ paddingTop: "20px" }}>
          <Typography variant="body2" sx={{ marginBottom: "15px", color: "#666" }}>
            Select a new priority level for this task:
          </Typography>
          
          <FormControl fullWidth>
            <InputLabel>Priority Level</InputLabel>
            <Select
              value={editingPriority}
              label="Priority Level"
              onChange={(e) => setEditingPriority(e.target.value)}
              disabled={updatingTaskId === editingTaskId}
            >
              <MenuItem value="LOW">
                <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Box sx={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#4CAF50" }} />
                  LOW - Can wait
                </Box>
              </MenuItem>
              <MenuItem value="MEDIUM">
                <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Box sx={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ffcc00" }} />
                  MEDIUM - Important
                </Box>
              </MenuItem>
              <MenuItem value="HIGH">
                <Box sx={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Box sx={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ff4d4d" }} />
                  HIGH - Urgent
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <Alert severity="info" sx={{ marginTop: "15px" }}>
            💡 Changing priority will update the task immediately
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenEditPriorityDialog(false)}
            variant="outlined"
            disabled={updatingTaskId === editingTaskId}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdatePriority}
            variant="contained"
            color="primary"
            disabled={updatingTaskId === editingTaskId || !editingPriority}
            startIcon={updatingTaskId === editingTaskId ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          >
            {updatingTaskId === editingTaskId ? "Updating..." : "Update Priority"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Profile Dialog */}
      <Dialog
        open={openProfileDialog}
        onClose={() => setOpenProfileDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#e3f2fd", borderBottom: "2px solid #1565C0" }}>
          <ProfileIcon sx={{ color: "#1565C0" }} />
          Your Profile & Credentials
        </DialogTitle>
        <DialogContent sx={{ paddingTop: "20px" }}>
          {user && (
            <Box>
              {/* Basic Information */}
              <Box sx={{ marginBottom: "20px", padding: "15px", backgroundColor: "#f5f5f5", borderRadius: "8px" }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", marginBottom: "15px", color: "#1565C0" }}>
                  👤 Personal Information
                </Typography>
                
                <Box sx={{ display: "flex", alignItems: "center", gap: "15px", marginBottom: "15px" }}>
                  <Box
                    sx={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      backgroundColor: "#1565C0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "28px",
                      fontWeight: "bold",
                    }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                      {user.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {user.role === "STUDENT" ? "👨‍🎓 Student" : "👨‍🏫 Staff/Faculty"}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ marginBottom: "10px" }}>
                  <strong>📧 Email:</strong> {user.email}
                </Typography>
                <Typography variant="body2">
                  <strong>🆔 User ID:</strong> {user.id}
                </Typography>
              </Box>

              {/* Student Information */}
              {user.role === "STUDENT" && (
                <Box sx={{ marginBottom: "20px", padding: "15px", backgroundColor: "#e8f5e9", borderRadius: "8px" }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", marginBottom: "15px", color: "#2e7d32" }}>
                    📚 Academic Information
                  </Typography>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <Box sx={{ padding: "10px", backgroundColor: "white", borderRadius: "6px", borderLeft: "4px solid #4caf50" }}>
                      <Typography variant="body2" sx={{ color: "#666" }}>
                        Department
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2e7d32" }}>
                        {user.department}
                      </Typography>
                    </Box>

                    <Box sx={{ padding: "10px", backgroundColor: "white", borderRadius: "6px", borderLeft: "4px solid #4caf50" }}>
                      <Typography variant="body2" sx={{ color: "#666" }}>
                        Course
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2e7d32" }}>
                        {user.course}
                      </Typography>
                    </Box>

                    <Box sx={{ padding: "10px", backgroundColor: "white", borderRadius: "6px", borderLeft: "4px solid #4caf50" }}>
                      <Typography variant="body2" sx={{ color: "#666" }}>
                        Year of Study
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: "bold", color: "#2e7d32" }}>
                        Year {user.yearOfStudy}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Staff Information */}
              {user.role === "STAFF" && (
                <Box sx={{ marginBottom: "20px", padding: "15px", backgroundColor: "#e3f2fd", borderRadius: "8px" }}>
                  <Typography variant="h6" sx={{ fontWeight: "bold", marginBottom: "15px", color: "#1565c0" }}>
                    👔 Staff Information
                  </Typography>

                  <Box sx={{ padding: "10px", backgroundColor: "white", borderRadius: "6px", borderLeft: "4px solid #1565c0" }}>
                    <Typography variant="body2" sx={{ color: "#666" }}>
                      Position
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: "bold", color: "#1565c0" }}>
                      {user.position}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* College Information */}
              <Box sx={{ marginBottom: "20px", padding: "15px", backgroundColor: "#fff3e0", borderRadius: "8px" }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", marginBottom: "10px", color: "#e65100" }}>
                  🏫 College Information
                </Typography>
                <Typography variant="body2">
                  <strong>College Type:</strong> {user.collegeType || "Main Campus"}
                </Typography>
              </Box>

              {/* Account Status */}
              <Alert severity="success" sx={{ marginBottom: "15px" }}>
                ✅ <strong>Account Status:</strong> Active and Verified
              </Alert>

              {/* Quick Actions */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Button
                  fullWidth
                  variant="outlined"
                  sx={{ color: "#1565C0", borderColor: "#1565C0" }}
                >
                  📝 Edit Profile
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  startIcon={<LogoutIcon />}
                  onClick={() => {
                    setOpenProfileDialog(false);
                    localStorage.removeItem("user");
                    onLogout();
                  }}
                >
                  Logout
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenProfileDialog(false)} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deadline Notification Snackbar */}
      <Snackbar
        open={showNotification}
        autoHideDuration={6000}
        onClose={() => setShowNotification(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowNotification(false)}
          severity={
            notificationMessage.includes("OVERDUE") ? "error" :
            notificationMessage.includes("TODAY") ? "warning" :
            notificationMessage.includes("Marked") || notificationMessage.includes("Priority updated") ? "success" :
            "info"
          }
          sx={{ width: "100%", fontSize: "0.95rem", fontWeight: "bold" }}
          icon={
            notificationMessage.includes("OVERDUE") ? <WarningIcon /> :
            notificationMessage.includes("TODAY") ? <NotificationsIcon /> :
            <CheckCircleIcon />
          }
        >
          {notificationMessage}
        </Alert>
      </Snackbar>

      </Container>
      
      {/* Background Sync Snackbar */}
      <Snackbar 
        open={bgSyncNotify} 
        autoHideDuration={8000} 
        onClose={() => setBgSyncNotify(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setBgSyncNotify(false)} severity="info" sx={{ width: '100%', bgcolor: '#1565C0', color: 'white', fontWeight: 'bold' }}>
            🔄 Initial tasks synced! Older emails are being processed in the background. Refresh in a few minutes.
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Dashboard;