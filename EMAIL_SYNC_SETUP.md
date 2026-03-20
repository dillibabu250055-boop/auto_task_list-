# Email Task Sync Setup Guide

This guide will help you set up Gmail integration to automatically sync tasks from your emails.

## Overview

The system uses Gmail's IMAP protocol to fetch unread emails from your inbox, parses them using AI (ChatGPT/Gemini) to extract tasks, and saves them to your task dashboard.

## Prerequisites

1. **Gmail Account** - with 2-Factor Authentication (2FA) enabled
2. **App Password** - Generated from your Google Account
3. **OpenAI/Gemini API Key** - For AI-powered email parsing

## Step 1: Enable 2FA and Generate App Password

### For Gmail/Google Account:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Scroll down to "How you sign in to Google"
3. Enable **2-Step Verification** if not already enabled
4. Go back to Security settings
5. Scroll down to "App passwords"
6. Select:
   - App: **Mail**
   - Device: **Windows Computer** (or your device)
7. Google will generate a 16-character app password
8. **Copy this password** - you'll need it for the dashboard

## Step 2: Get OpenAI API Key (Optional but Recommended)

If you want AI-powered task extraction:

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign up or log in
3. Navigate to API keys
4. Create a new secret key
5. Copy the API key

## Step 3: Configure Backend

### Environment Variables

Set these environment variables on your system:

**Windows PowerShell:**
```powershell
$env:GMAIL_EMAIL = "your.email@gmail.com"
$env:GMAIL_PASSWORD = "your-app-password-here"
$env:OPENAI_API_KEY = "sk-your-openai-key-here"
```

**Or in `application.properties`:**
```properties
spring.mail.username=your.email@gmail.com
spring.mail.password=your-app-password
app.openai.api-key=sk-your-openai-key
```

## Step 4: Start the Application

### Backend:
```bash
cd auto_task_list/backend
mvn spring-boot:run
```

### Frontend:
```bash
cd frontend
npm install  # Install new @mui/icons-material dependency
npm start
```

## Step 5: Sync Emails

1. Open the dashboard at `http://localhost:3000`
2. Click **"Sync Gmail Tasks"** button (top right)
3. Enter your Gmail credentials:
   - **Gmail Address**: your.email@gmail.com
   - **App Password**: (the 16-char password from Step 1)
4. Click **"Sync Now"**
5. The system will:
   - Fetch unread emails from your inbox
   - Parse them to extract tasks
   - Save tasks to the dashboard

## Email Format for Task Extraction

To ensure emails are properly parsed into tasks, include these details:

### Example Email Subject:
```
Project Report - Due Friday - High Priority
```

### Example Email Body:
```
Please complete the project report by Friday.
Priority: High
Status: Pending
Deadline: 2026-03-20
```

The AI will extract:
- **Title**: From subject/content
- **Description**: From email body
- **Deadline**: Date mentioned
- **Priority**: HIGH/MEDIUM/LOW
- **Status**: PENDING/APPROVED/COMPLETED

## Features

✅ **Email Integration**: Connect to Gmail INBOX
✅ **AI-Powered Parsing**: Automatically extract tasks from email content
✅ **Task Management**: View, create, and update tasks
✅ **Priority Levels**: HIGH, MEDIUM, LOW
✅ **Status Tracking**: PENDING, APPROVED, COMPLETED
✅ **Email Source Tracking**: See which email each task came from
✅ **Real-time Sync**: Fetch and sync emails on demand

## Dashboard Features

- **Sync Gmail Tasks**: Button to manually trigger email synchronization
- **Refresh**: Reload tasks from database
- **Task Cards**: Display task details with priority color coding
- **Email Badge**: Shows "(From Email)" for tasks created from emails
- **Status & Priority**: Visual chips showing current status and priority

## Troubleshooting

### Issue: "Error syncing emails"
- **Check 1**: Verify Gmail address and app password are correct
- **Check 2**: Ensure 2FA is enabled on your Google Account
- **Check 3**: Check that you're using the app password, not your regular password

### Issue: "No tasks created from emails"
- **Check 1**: Ensure OpenAI API key is configured
- **Check 2**: Verify emails have clear subject and body content
- **Check 3**: Check backend logs for parsing errors
- **Check 4**: Make sure there are unread emails in your inbox

### Issue: Backend won't start
- **Check 1**: Ensure MySQL/H2 database is accessible
- **Check 2**: Check port 8080 is not in use
- **Check 3**: Review console logs for detailed error

### Issue: Frontend won't connect to backend
- **Check 1**: Backend is running on http://localhost:8080
- **Check 2**: CORS is enabled (already configured in TaskController)
- **Check 3**: Check browser console for network errors

## API Endpoints

### Get All Tasks
```
GET http://localhost:8080/api/tasks
```

### Create Task
```
POST http://localhost:8080/api/tasks
{
  "title": "string",
  "description": "string",
  "deadline": "2026-03-20T10:00:00",
  "priority": "HIGH|MEDIUM|LOW",
  "status": "PENDING|APPROVED|COMPLETED",
  "senderEmail": "sender@example.com"
}
```

### Sync Emails
```
POST http://localhost:8080/api/tasks/sync-emails
{
  "email": "your.email@gmail.com",
  "appPassword": "xxxx xxxx xxxx xxxx"
}
```

### Update Task
```
PUT http://localhost:8080/api/tasks/{id}
{
  "title": "string",
  "description": "string",
  "deadline": "2026-03-20T10:00:00",
  "priority": "HIGH|MEDIUM|LOW",
  "status": "PENDING|APPROVED|COMPLETED",
  "senderEmail": "sender@example.com"
}
```

### Delete Task
```
DELETE http://localhost:8080/api/tasks/{id}
```

## Security Notes

- App passwords are only sent to the backend during the sync session
- Credentials are NOT stored anywhere
- Each sync requires entering credentials again
- Use environment variables for sensitive data
- Keep your OpenAI API key private

## Next Steps

1. Set up scheduled syncing (add @Scheduled annotation to fetch emails periodically)
2. Implement email filtering (only specific senders)
3. Add task categories from email labels
4. Integration with Gmail labels to organize synced tasks
5. Email notification when tasks are completed
