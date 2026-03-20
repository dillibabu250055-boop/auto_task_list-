# Quick Start: Email Task Sync

## 🚀 Get Started in 5 Minutes

### 1. **Generate Gmail App Password**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Enable 2-Step Verification (if not enabled)
   - Find "App passwords" → Select Mail → Get your 16-character password

### 2. **Get OpenAI API Key (Optional)**
   - Visit [OpenAI API](https://platform.openai.com/api-keys)
   - Create a new secret key
   - Save it

### 3. **Start Backend**
   ```powershell
   cd auto_task_list\backend
   mvn spring-boot:run
   ```
   ✅ Backend runs on http://localhost:8080

### 4. **Start Frontend**
   ```powershell
   cd frontend
   npm install
   npm start
   ```
   ✅ Frontend runs on http://localhost:3000

### 5. **Sync Your First Email Task**
   - Open http://localhost:3000
   - Click **"Sync Gmail Tasks"** (top right)
   - Enter:
     - Gmail: your.email@gmail.com
     - Password: (16-char app password from step 1)
   - Click "Sync Now"
   - 🎉 Tasks from your emails appear on dashboard!

---

## 📧 How It Works

```
Gmail Inbox → Backend fetches emails → AI parses tasks → Dashboard shows tasks
```

1. **Your Email** → Unread emails are fetched via IMAP
2. **AI Parsing** → ChatGPT/Gemini extracts task details
3. **Task Created** → Title, deadline, priority, status saved
4. **Dashboard** → Tasks display with email source badge

---

## 🎯 Example Email

**Subject:** Project Report Due Friday

**Body:**
```
Please complete the project report by Friday.
Make it comprehensive.

Deadline: 2026-03-20
Priority: High
```

**Creates Task:**
- Title: Project Report Due Friday
- Description: Please complete the project report by Friday...
- Deadline: 2026-03-20
- Priority: HIGH
- Status: PENDING
- Source: ✉️ From Email

---

## 🔧 Configuration

Set environment variables (Windows PowerShell):
```powershell
$env:GMAIL_EMAIL = "your.email@gmail.com"
$env:GMAIL_PASSWORD = "your-app-password"
$env:OPENAI_API_KEY = "sk-your-api-key"
```

Or edit `application.properties`:
```properties
spring.mail.username=your.email@gmail.com
spring.mail.password=your-app-password
app.openai.api-key=sk-your-api-key
```

---

## ✨ Features

✅ Real-time Gmail sync
✅ AI-powered task extraction  
✅ Task priority levels (HIGH/MEDIUM/LOW)
✅ Status tracking (PENDING/APPROVED/COMPLETED)
✅ Email source tracking
✅ Beautiful Material-UI dashboard

---

## 🐛 Troubleshooting

**Issue:** Backend won't start
- Check if port 8080 is free: `netstat -ano | findstr :8080`

**Issue:** "Failed to sync emails"
- Verify you're using app password, NOT your Google password
- Check 2FA is enabled on Google Account
- Verify email address is correct

**Issue:** No tasks from emails
- Ensure OpenAI API key is set
- Verify emails have clear content
- Check backend logs for errors

---

For detailed setup, see [EMAIL_SYNC_SETUP.md](EMAIL_SYNC_SETUP.md)
