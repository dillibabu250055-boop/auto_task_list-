import React, { useState, useEffect, useRef } from "react";
import { Box, Fab, Paper, Typography, TextField, Button, IconButton, List, Tooltip, CircularProgress } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import MicIcon from "@mui/icons-material/Mic";
import axios from "axios";

const Chatbot = ({ tasks, loadTasks }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hello! Try saying 'Add a high priority task to review code' or click the mic to speak!" }
  ]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const endOfMessagesRef = useRef(null);
  
  useEffect(() => {
    if (endOfMessagesRef.current) {
        endOfMessagesRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const handleSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support Speech Recognition.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      // Auto send shortly after hearing it
      setTimeout(() => processInput(transcript), 500);
    };

    recognition.onerror = (e) => {
      console.error("Speech error", e);
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const processInput = async (userInputText) => {
    if (!userInputText.trim()) return;
    const userMsg = userInputText.trim();
    setMessages(prev => [...prev, { sender: "user", text: userMsg }]);
    setInput("");
    setIsProcessing(true);

    const lowerInput = userMsg.toLowerCase();
    
    // Improved categorization
    const isTaskAction = /(add|create|make|new|update|delete|remove)\b.*(task|todo)/i.test(lowerInput);
    const isTaskQuery = /(show|list|get|what|my|urgent|priority|summary|summarize)\b.*(task|todo|urgent|priority|summary)/i.test(lowerInput);
    
    if (isTaskAction || isTaskQuery || lowerInput === "tasks") {
        // --- Task Management Mode ---
        if (/(add|create|make|new)/i.test(lowerInput)) {
            try {
                let priority = "MEDIUM";
                if (lowerInput.includes("high") || lowerInput.includes("urgent")) priority = "HIGH";
                else if (lowerInput.includes("low")) priority = "LOW";
                
                let extractedTitle = userMsg
                    .replace(/(please )?(add|create|make) (a )?(high|medium|low|urgent)? ?priority ?task (to|for)? /i, "")
                    .replace(/add task /i, "");
                
                extractedTitle = extractedTitle.charAt(0).toUpperCase() + extractedTitle.slice(1);

                const newTask = {
                    title: extractedTitle,
                    description: "- [ ] AI generated step 1\n- [ ] AI generated step 2", 
                    priority: priority,
                    status: "PENDING",
                    senderEmail: "ai.chatbot@local"
                };

                await axios.post("http://localhost:8080/api/tasks", newTask);
                
                setMessages(prev => [...prev, { sender: "bot", text: `✅ Created a ${priority} priority task: "${extractedTitle}"` }]);
                if (loadTasks) loadTasks();
            } catch (err) {
                setMessages(prev => [...prev, { sender: "bot", text: "❌ Failed to create task." }]);
            }
        } 
        else if (lowerInput.includes("summary") || lowerInput.includes("summarize")) {
            const pending = tasks.filter(t => t.status === "PENDING").length;
            const comp = tasks.filter(t => t.status === "COMPLETED").length;
            setMessages(prev => [...prev, { sender: "bot", text: `📊 Task Summary: You have ${tasks.length} total tasks. ${pending} Pending, and ${comp} Completed.` }]);
        } 
        else if (lowerInput.includes("priority") || lowerInput.includes("urgent")) {
            const highPriority = tasks.filter(t => t.priority === "HIGH" && t.status !== "COMPLETED");
            if (highPriority.length > 0) {
                setMessages(prev => [...prev, { sender: "bot", text: `🚨 You have ${highPriority.length} high priority tasks pending. Try working on: "${highPriority[0].title}"` }]);
            } else {
                setMessages(prev => [...prev, { sender: "bot", text: "✅ No high priority tasks right now!" }]);
            }
        }
        else if (lowerInput.includes("academic") || lowerInput.includes("class") || lowerInput.includes("course")) {
            const academic = tasks.filter(t => t.category === "ACADEMIC" && t.status !== "COMPLETED");
            if (academic.length > 0) {
                setMessages(prev => [...prev, { sender: "bot", text: `📚 You have ${academic.length} pending academic tasks. Latest: "${academic[0].title}"` }]);
            } else {
                setMessages(prev => [...prev, { sender: "bot", text: "No academic tasks pending! Time to relax? 😎" }]);
            }
        }
        else {
            const pendingNames = tasks.filter(t => t.status !== "COMPLETED").map(t => t.title).slice(0, 3);
            if (pendingNames.length > 0) {
                setMessages(prev => [...prev, { sender: "bot", text: `📝 You have ${tasks.length} tasks. Here are a few to do: 1. ${pendingNames[0]} ${pendingNames[1] ? '2. ' + pendingNames[1] : ''}` }]);
            } else {
                setMessages(prev => [...prev, { sender: "bot", text: "You have no pending tasks!" }]);
            }
        }
    } else if (lowerInput.includes("hello") || lowerInput.includes("hi ") || lowerInput === "hi" || lowerInput === "hey") {
        setMessages(prev => [...prev, { sender: "bot", text: "Hello! I am Nexus AI. I can manage your tasks or answer questions exactly." }]);
    } else {
        // --- Lightning Fast Web Search & Exact Summary ---
        try {
            setMessages(prev => [...prev, { sender: "bot", text: "Searching..." }]);
            
            let exactAnswer = "";
            let source = "";
            
            try {
                // 1. DuckDuckGo Instant Answers (Lightning fast, exact curated facts)
                const ddgRes = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(userMsg)}&format=json&no_html=1&skip_disambig=1`);
                if (ddgRes.data && ddgRes.data.AbstractText) {
                    exactAnswer = ddgRes.data.AbstractText;
                    source = "DuckDuckGo";
                }
            } catch (e) {
                // Ignore DDG network limits
            }

            // 2. Wikipedia Exsentences API (Instant summarized sentences, avoids massive strings)
            if (!exactAnswer) {
                const searchRes = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(userMsg)}&utf8=&format=json&origin=*`);
                
                if (searchRes.data.query.search.length > 0) {
                    const pageId = searchRes.data.query.search[0].pageid;
                    // Ask specifically for NO FLUFF, just 2 summary sentences!
                    const pageRes = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=extracts&exintro=1&explaintext=1&exsentences=2&pageids=${pageId}`);
                    let extract = pageRes.data.query.pages[pageId].extract;
                    
                    if (extract) {
                        exactAnswer = extract;
                        source = "Wikipedia";
                    }
                }
            }
            
            if (exactAnswer) {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { sender: "bot", text: `💡 Response (${source}):\n${exactAnswer}` };
                    return newMsgs;
                });
            } else {
                setMessages(prev => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = { sender: "bot", text: "I couldn't find an exact, concise answer for that instantly. Can I help you log a task instead?" };
                    return newMsgs;
                });
            }
        } catch (error) {
            setMessages(prev => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1] = { sender: "bot", text: "Sorry, my instant search is currently unreachable." };
                return newMsgs;
            });
        }
    }
    
    setIsProcessing(false);
  };

  const handleSend = () => processInput(input);

  return (
    <>
      <Fab 
        onClick={() => setOpen(!open)}
        sx={{ 
          position: "fixed", 
          bottom: 24, 
          right: 24, 
          zIndex: 1000, 
          background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)',
          boxShadow: '0 8px 24px rgba(21, 101, 192, 0.4), inset 1px 2px 4px rgba(255, 255, 255, 0.5), inset -2px -2px 6px rgba(0, 0, 0, 0.3)',
          transform: 'perspective(200px) translateZ(0)',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          '&:hover': {
            background: 'linear-gradient(135deg, #42a5f5 0%, #1976d2 100%)',
            transform: 'perspective(200px) translateZ(15px) scale(1.08)',
            boxShadow: '0 12px 28px rgba(21, 101, 192, 0.5), inset 2px 2px 6px rgba(255, 255, 255, 0.6), inset -2px -2px 6px rgba(0, 0, 0, 0.3)',
          }
        }}
      >
        <SmartToyIcon sx={{ fontSize: "2.2rem", color: "white", filter: "drop-shadow(2px 3px 2px rgba(0,0,0,0.4))" }} />
      </Fab>
      
      {open && (
        <Paper
          elevation={8}
          sx={{
            position: "fixed", bottom: 90, right: 24, width: 350, height: 450,
            display: "flex", flexDirection: "column", zIndex: 1000, borderRadius: "16px", overflow: "hidden"
          }}
        >
          <Box sx={{ 
            background: "linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)", 
            color: "white", p: 2, display: "flex", justifyContent: "space-between", alignItems: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2), inset 0 2px 4px rgba(255,255,255,0.2)"
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SmartToyIcon sx={{ filter: "drop-shadow(1px 2px 1px rgba(0,0,0,0.5))", fontSize: '1.8rem' }} />
              <Typography variant="subtitle1" fontWeight="bold" sx={{ textShadow: "1px 1px 2px rgba(0,0,0,0.5)" }}>Nexus AI Assistant</Typography>
            </Box>
            <IconButton size="small" sx={{ color: "white" }} onClick={() => setOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
          
          <List sx={{ flexGrow: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1.5, bgcolor: "background.default" }}>
            {messages.map((msg, idx) => (
              <Box key={idx} sx={{ display: "flex", justifyContent: msg.sender === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 1.5 }}>
                {msg.sender === "bot" && (
                  <Box sx={{ 
                    borderRadius: "50%", background: "linear-gradient(135deg, #1e88e5, #0d47a1)", p: 0.8, 
                    boxShadow: "0 4px 8px rgba(0,0,0,0.3), inset 1px 1px 2px rgba(255,255,255,0.4)", display: "flex"
                  }}>
                    <SmartToyIcon sx={{ color: "white", fontSize: "1.2rem", filter: "drop-shadow(1px 2px 1px rgba(0,0,0,0.4))" }} />
                  </Box>
                )}
                <Box sx={{ 
                  bgcolor: msg.sender === "user" ? "primary.main" : "background.paper",
                  color: msg.sender === "user" ? "white" : "text.primary",
                  p: 1.5, borderRadius: msg.sender === "user" ? "18px 18px 0 18px" : "18px 18px 18px 0",
                  maxWidth: "80%", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
                }}>
                  <Typography variant="body2">{msg.text}</Typography>
                </Box>
              </Box>
            ))}
            {isProcessing && <CircularProgress size={20} sx={{ ml: 4, mt: 1 }} />}
            <div ref={endOfMessagesRef} style={{ height: "1px" }} />
          </List>
          
          <Box sx={{ p: 1.5, bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider", display: "flex", gap: 1, alignItems: "center" }}>
            <Tooltip title="Voice Command">
              <IconButton 
                color={isListening ? "error" : "default"} 
                onClick={handleSpeech}
                sx={{
                  animation: isListening ? "pulse 1.5s infinite" : "none",
                  "@keyframes pulse": { "0%": { transform: "scale(1)" }, "50%": { transform: "scale(1.2)" }, "100%": { transform: "scale(1)" } }
                }}
              >
                <MicIcon />
              </IconButton>
            </Tooltip>
            <TextField 
              size="small" fullWidth placeholder="Type a command..." 
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '20px' } }}
            />
            <Button variant="contained" onClick={handleSend} sx={{ borderRadius: '20px', minWidth: '70px', bgcolor: "primary.main" }}>
                Send
            </Button>
          </Box>
        </Paper>
      )}
    </>
  );
};

export default Chatbot;
