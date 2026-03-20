# Architecture & Data Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WEB BROWSER (React)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              FRONTEND (localhost:3000)               │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │            Dashboard Component                 │  │   │
│  │  │  • Task Grid Display                           │  │   │
│  │  │  • Email Sync Dialog                          │  │   │
│  │  │  • Credential Input Form                      │  │   │
│  │  │  • Status/Error Messages                      │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                      ↕ (Axios)                         │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │         Material-UI Components                 │  │   │
│  │  │  • Cards, Chips, Dialogs, Buttons             │  │   │
│  │  │  • Icons (Email, Sync, Refresh)               │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                      HTTP/REST
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
┌───────▼────────────────────────────────────▼──────────────────┐
│              SPRING BOOT BACKEND (localhost:8080)             │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │           TaskController                              │   │
│  │  • GET  /api/tasks            → Get all tasks        │   │
│  │  • POST /api/tasks            → Create task          │   │
│  │  • PUT  /api/tasks/{id}       → Update task          │   │
│  │  • DELETE /api/tasks/{id}     → Delete task          │   │
│  │  • POST /api/tasks/sync-emails → Sync Gmail (NEW)    │   │
│  └────────────────────────────────────────────────────────┘   │
│                           ↕                                    │
│  ┌────────────────────────────────────────────────────────┐   │
│  │         EmailFetchService (NEW)                        │   │
│  │                                                         │   │
│  │  connect to Gmail IMAP ─┐                             │   │
│  │  fetch unread emails    ├─→ EmailFetchService         │   │
│  │  extract content        │                             │   │
│  │                         └─→ AiParsingService          │   │
│  └────────────────────────────────────────────────────────┘   │
│                           │                                    │
│                    ┌──────┴──────┐                             │
│                    ▼             ▼                             │
│  ┌─────────────────────────┐ ┌──────────────────────┐        │
│  │   AiParsingService      │ │  TaskRepository      │        │
│  │   (ENHANCED)            │ │  (JPA)               │        │
│  │                         │ │                      │        │
│  │  • OpenAI API mode      │ │  Saves/Retrieves    │        │
│  │  • Fallback mode        │ │  tasks from DB      │        │
│  │  • Extract task fields  │ │                      │        │
│  │  • Parse deadlines      │ │                      │        │
│  │  • Priority detection   │ │                      │        │
│  └─────────────────────────┘ └──────────────────────┘        │
│                                        │                       │
└────────────────────────────────────────┼───────────────────────┘
                                         │
                    ┌────────────────────┘
                    │
        ┌───────────▼──────────┬──────────────┐
        │                      │              │
        ▼                      ▼              ▼
   ┌─────────┐          ┌──────────┐   ┌──────────────┐
   │  Gmail  │          │ Database │   │  OpenAI      │
   │ (IMAP)  │          │ (H2/MySQL)   │  API         │
   └─────────┘          └──────────┘   └──────────────┘
```

---

## Email Processing Flow

```
User sends email
        │
        ▼
Gmail Inbox (IMAP)
        │
        ├─→ User clicks "Sync Gmail Tasks"
        │
        ├─→ Frontend opens Email Sync Dialog
        │
        ├─→ User enters:
        │   • Gmail address
        │   • App password
        │
        ├─→ Frontend sends POST /api/tasks/sync-emails
        │
        ▼
EmailFetchService
        │
        ├─→ Connect to Gmail IMAP
        │   - Host: imap.gmail.com:993
        │   - Auth: email + appPassword
        │
        ├─→ Open INBOX folder
        │
        ├─→ Query for unread emails
        │
        ├─→ For EACH email:
        │   │
        │   ├─→ Extract:
        │   │   • Subject
        │   │   • Body (text/HTML/multipart)
        │   │   • Sender email
        │   │
        │   ├─→ Combine into emailBody string
        │   │
        │   ├─→ Pass to AiParsingService
        │   │
        │   ▼
        │  AiParsingService
        │   │
        │   ├─→ Check if OpenAI key available
        │   │
        │   ├─→ YES: Send to ChatGPT (gpt-3.5-turbo)
        │   │   └─→ Request JSON with structure:
        │   │       {
        │   │         "title": "...",
        │   │         "description": "...",
        │   │         "deadline": "2026-03-20...",
        │   │         "priority": "HIGH|MEDIUM|LOW",
        │   │         "status": "PENDING"
        │   │       }
        │   │   └─→ Parse response (clean markdown if present)
        │   │   └─→ Return Task object
        │   │
        │   ├─→ NO: Use Fallback mode
        │   │   └─→ Extract from email text:
        │   │       • Title from subject
        │   │       • Description from body
        │   │       • Deadline (regex search)
        │   │       • Priority (keyword search)
        │   │       • Status = PENDING
        │   │   └─→ Return Task object
        │   │
        │   └─→ Set senderEmail on Task
        │
        ├─→ Save Task to Database
        │
        ├─→ Add to syncedTasks list
        │
        └─→ Return to controller
        │
        ▼
TaskController responds with:
{
  "success": true,
  "message": "Successfully synced 3 tasks from emails",
  "tasksCount": 3,
  "tasks": [/* array of saved tasks */]
}
        │
        ▼
Frontend receives response
        │
        ├─→ Show success alert
        │
        ├─→ Auto-close dialog
        │
        ├─→ Call loadTasks()
        │
        └─→ Dashboard reloads and displays all tasks
                with email badge on newly synced ones
```

---

## Task State Diagram

```
┌─────────────────────┐
│   Email Received    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Extract: Subject, Body, Sender      │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  AI Parse → Task Object              │
│  • Title (from subject/body)         │
│  • Description (from body)           │
│  • Deadline (parsed from text)       │
│  • Priority (HIGH/MEDIUM/LOW)        │
│  • Status (PENDING)                  │
│  • SenderEmail (from email.from)     │
└──────────┬──────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Save to Database                    │
│  ├─ Store in tasks table             │
│  └─ Assign ID (auto-generated)       │
└──────────┬─────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│  Display on Dashboard                │
│  ├─ Show task card                   │
│  ├─ Color code by priority           │
│  ├─ Add "From Email" badge           │
│  └─ Show sender email                │
└──────────┬─────────────────────────┘
           │
           ▼
       PENDING
           │
    ┌──────┼──────┐
    │      │      │
    ▼      ▼      ▼
APPROVED COMPLETED REJECTED
    │      │      │
    └──────┼──────┘
           │
           ▼
     ARCHIVED/DONE
```

---

## Data Models

### Task Entity
```
Task
├─ id: Long (PK)
├─ title: String
├─ description: String
├─ deadline: LocalDateTime
├─ priority: Priority (Enum)
│  └─ Values: HIGH, MEDIUM, LOW
├─ status: Status (Enum)
│  └─ Values: PENDING, APPROVED, COMPLETED
└─ senderEmail: String (email address from)

Stored in database:
- H2 (in-memory for dev)
- MySQL (for production)
```

### API Request/Response
```
Sync Emails Request:
{
  "email": "user@gmail.com",
  "appPassword": "xxxx xxxx xxxx xxxx"
}

Sync Emails Response (Success):
{
  "success": true,
  "message": "Successfully synced 3 tasks from emails",
  "tasksCount": 3,
  "tasks": [
    {
      "id": 1,
      "title": "Task from email",
      "description": "Email content",
      "deadline": "2026-03-20T09:00:00",
      "priority": "HIGH",
      "status": "PENDING",
      "senderEmail": "sender@gmail.com"
    },
    ...
  ]
}

Sync Emails Response (Error):
{
  "success": false,
  "message": "Error syncing emails: Invalid credentials"
}
```

---

## Technology Stack

### Frontend
```
React 19.2.4
├─ Material-UI 7.3.9
├─ @mui/icons-material 7.3.9
├─ Axios 1.13.6 (HTTP client)
└─ Material-UI/Emotion (styling)
```

### Backend
```
Spring Boot 4.0.3
├─ Spring Data JPA (ORM)
├─ Spring Web (REST)
├─ Spring Mail (IMAP client)
├─ Jackson (JSON parsing)
├─ H2 Database (development)
└─ Jakarta Mail / JavaMail (IMAP protocol)
```

### External APIs
```
Gmail
├─ Protocol: IMAP (RFC 3501)
├─ Host: imap.gmail.com:993 (SSL/TLS)
├─ Authentication: App Password
└─ Fetches: Unread emails only

OpenAI (Optional)
├─ Endpoint: https://api.openai.com/v1/chat/completions
├─ Model: gpt-3.5-turbo
└─ Purpose: Task extraction from email text
```

---

## Security Flow

```
User Input
    │
    ▼
┌─────────────────────────────────────┐
│  Validate Credentials               │
│  ├─ Email format check              │
│  └─ Password length check           │
└──────────┬──────────────────────────┘
           │
    ┌──────▼──────┐
    │ Valid?      │
    ├─ YES ──────┐│
    │ NO ───┐   ││
    └───────┼───┼┘
            │   │
            ▼   │
        Error   │
       Message  │
            ▼   │
        User    │
        Sees    │
        Error:  │
        "Please │
        enter   └────┐
        both"        │
                     ▼
              HTTPS/TLS
              Encrypted
              Connection
                     │
                     ▼
            Gmail IMAP Server
            (Authenticates creds)
                     │
            ┌────────┴────────┐
            │                 │
       Valid            Invalid
            │                 │
            ▼                 ▼
        Fetch          Error  to
        Unread         Frontend
        Emails
            │
            ▼
        In-memory
        Processing
        (No storage
         of credentials)
            │
            ▼
        Create Tasks
            │
            ▼
        Database
        (Only task data,
         not credentials)
            │
            ▼
        Response to
        Frontend
            │
            ▼
        User sees
        success/tasks
```

---

## Load & Performance Estimates

```
Email Sync Performance
├─ Gmail IMAP connection: ~500ms
├─ Fetch 1 unread email: ~200ms
├─ Parse 1 email (AI): ~1-2s (with API) / ~100ms (fallback)
├─ Save to database: ~50ms per task
└─ Total for 5 emails: ~10-15 seconds (with API)

Frontend Responsiveness
├─ Dialog open: <100ms
├─ Form validation: <50ms
├─ Sync request sent: <100ms
├─ Task list refresh: ~300ms
└─ Overall: <1s user-perceived delay

Database Capacity
├─ H2 (dev): ~10,000 tasks
├─ MySQL: Millions of tasks
├─ Index on deadline: Fast querying
└─ Index on senderEmail: Fast filtering
```

---

## Error Handling Chain

```
Error Source
    │
    ├─→ Gmail Connection Error
    │   └─→ "Failed to connect to Gmail: Check credentials"
    │
    ├─→ Invalid Credentials
    │   └─→ "Error syncing emails: Invalid credentials"
    │
    ├─→ No Unread Emails
    │   └─→ "Successfully synced 0 tasks from emails"
    │
    ├─→ AI Parsing Error
    │   ├─→ With API: Try fallback parsing
    │   └─→ Return partial task (best effort)
    │
    ├─→ Database Error
    │   └─→ "Database error saving tasks"
    │
    ├─→ Frontend Validation Error
    │   ├─→ Empty email: "Please enter email"
    │   └─→ Empty password: "Please enter password"
    │
    └─→ Network Error
        └─→ "Failed to sync emails. Check connection."
```

All errors returned to frontend with user-friendly messages! ✅
