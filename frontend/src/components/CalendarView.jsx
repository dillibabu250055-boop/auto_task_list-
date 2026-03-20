import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Button,
  Chip,
  Divider,
  Stack,
  Drawer,
  IconButton as MuiIconButton,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EventIcon from "@mui/icons-material/Event";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentIcon from "@mui/icons-material/Assignment";

const CalendarView = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDayTasks, setSelectedDayTasks] = useState([]);

  // Calculate days
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getTasksForDay = (day) => {
    if (!day) return [];
    return tasks.filter(task => {
      if (!task.deadline) return false;
      const d = new Date(task.deadline);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  const handleDayClick = (day) => {
    if (!day) return;
    const dayTasks = getTasksForDay(day);
    setSelectedDay(day);
    setSelectedDayTasks(dayTasks);
    setDrawerOpen(true);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "HIGH": return "#d32f2f";
      case "MEDIUM": return "#ed6c02";
      case "LOW": return "#2e7d32";
      default: return "#757575";
    }
  };

  // Generate calendar grid
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 4 }, borderRadius: 4, bgcolor: "white", minHeight: "80vh" }}>
        
        {/* Header Section */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4, flexWrap: "wrap", gap: 2 }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: "#1565C0", fontSize: { xs: "2rem", md: "3rem" } }}>
              {monthNames[month]} <span style={{ color: "#999", fontWeight: 300 }}>{year}</span>
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton onClick={prevMonth} sx={{ border: "1px solid #eee" }}><ChevronLeftIcon /></IconButton>
            <Button 
                variant="outlined" 
                onClick={() => setCurrentDate(new Date())}
                sx={{ borderRadius: 3, fontWeight: "bold", px: { xs: 2, md: 4 } }}
            >
                Today
            </Button>
            <IconButton onClick={nextMonth} sx={{ border: "1px solid #eee" }}><ChevronRightIcon /></IconButton>
          </Stack>
        </Box>

        {/* Days of Week - Grid Header (Locked to 7 Columns) */}
        <Box sx={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(7, 1fr)", 
          gap: 1, 
          mb: 1 
        }}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <Typography key={day} variant="button" sx={{ 
              textAlign: "center", 
              fontWeight: 900, 
              color: "#aaa",
              fontSize: "0.75rem",
              pb: 1
            }}>
              {day}
            </Typography>
          ))}
        </Box>

        {/* Calendar Grid (Locked to 7 Columns) */}
        <Box sx={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(7, 1fr)", 
          gridAutoRows: "minmax(120px, auto)",
          gap: 1.5 
        }}>
          {days.map((day, idx) => {
            const dayTasks = getTasksForDay(day);
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            
            return (
              <Box
                key={idx}
                onClick={() => handleDayClick(day)}
                sx={{
                  borderRadius: 3,
                  border: day ? "1px solid" : "none",
                  borderColor: isToday ? "#1565C0" : "#f0f0f0",
                  bgcolor: isToday ? "#f0f7ff" : day ? "white" : "transparent",
                  p: 2,
                  cursor: day ? "pointer" : "default",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  visibility: day ? "visible" : "visible", // Maintain grid structure
                  "&:hover": day ? {
                    bgcolor: "#f8f9fa",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
                    transform: "translateY(-4px)",
                    borderColor: "#1565C0",
                    zIndex: 2
                  } : {}
                }}
              >
                {day && (
                  <>
                    <Typography variant="h6" sx={{ 
                      fontWeight: isToday ? 900 : 600,
                      color: isToday ? "#1565C0" : "#333",
                      fontSize: "1.2rem",
                      mb: 1
                    }}>
                      {day}
                    </Typography>
                    
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                      {dayTasks.map(task => (
                        <Tooltip key={task.id} title={task.title}>
                          <Box sx={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: "50%", 
                              bgcolor: getPriorityColor(task.priority),
                              animation: "pulse 2s infinite"
                          }} />
                        </Tooltip>
                      ))}
                    </Stack>
                    
                    {dayTasks.length > 0 && (
                        <Typography variant="caption" sx={{ mt: 1, display: "block", color: "textSecondary", fontWeight: "bold" }}>
                            {dayTasks.length} {dayTasks.length === 1 ? 'task' : 'tasks'}
                        </Typography>
                    )}
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* Side Drawer for Details */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 450 }, borderRadius: { xs: 0, sm: "24px 0 0 24px" } }
        }}
      >
        <Box sx={{ p: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
            <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#1565C0" }}>
                    {selectedDay} {monthNames[month]}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                    Details for selected date
                </Typography>
            </Box>
            <MuiIconButton onClick={() => setDrawerOpen(false)} sx={{ bgcolor: "#f5f5f5" }}>
                <CloseIcon />
            </MuiIconButton>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {selectedDayTasks.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 10, opacity: 0.5 }}>
                <EventIcon sx={{ fontSize: 80, mb: 2 }} />
                <Typography variant="h6">No tasks scheduled</Typography>
            </Box>
          ) : (
            <Stack spacing={2.5}>
              {selectedDayTasks.map((task) => (
                <Paper key={task.id} elevation={0} variant="outlined" sx={{ 
                    p: 3, 
                    borderRadius: 4, 
                    borderLeft: `8px solid ${getPriorityColor(task.priority)}`,
                    transition: "transform 0.2s",
                    "&:hover": { transform: "translateX(8px)", bgcolor: "#fafafa" }
                }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Chip 
                      label={task.priority} 
                      size="small" 
                      sx={{ bgcolor: getPriorityColor(task.priority), color: "white", fontWeight: 800, fontSize: "0.65rem" }} 
                    />
                    <Stack direction="row" spacing={0.5} alignItems="center">
                        <AccessTimeIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                        <Typography variant="caption" fontWeight="bold">
                            {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                    </Stack>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: "#1a1a1a" }}>{task.title}</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                    {task.description}
                  </Typography>
                  <Divider sx={{ my: 1.5, borderStyle: "dashed" }} />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <AssignmentIcon sx={{ fontSize: 16, color: "#1565C0" }} />
                    <Typography variant="caption" sx={{ fontWeight: "bold", color: "#1565C0" }}>
                        From: {task.senderEmail?.split('<')[0] || 'Internal Task'}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}

          <Box sx={{ mt: 5 }}>
            <Button fullWidth variant="contained" size="large" sx={{ borderRadius: 4, py: 2, bgcolor: "#1565C0", fontWeight: "bold" }}>
                Export to Calendar
            </Button>
          </Box>
        </Box>
      </Drawer>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.4); opacity: 0.6; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
    </Box>
  );
};

export default CalendarView;
