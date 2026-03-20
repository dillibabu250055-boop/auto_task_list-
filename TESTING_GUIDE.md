# 🧪 Testing Email Sync Feature

## Pre-Test Checklist

- [ ] Backend running on port 8080
- [ ] Frontend running on port 3000
- [ ] Gmail account with 2FA enabled
- [ ] App password generated from Gmail
- [ ] OpenAI API key (optional, but recommended)

---

## Test Scenarios

### Test 1: Basic Email Sync

**Setup:**
1. Send yourself a test email with this format:
   ```
   Subject: Complete Q1 Report - High Priority
   Body: 
   Please complete the quarterly report.
   Deadline: 2026-03-20
   Priority: High
   ```

**Steps:**
1. Open Dashboard at http://localhost:3000
2. Click "Sync Gmail Tasks" button
3. Enter your Gmail and app password
4. Click "Sync Now"

**Expected Results:**
✅ Success message appears: "Successfully synced 1 tasks"
✅ Task appears on dashboard
✅ Title: "Complete Q1 Report - High Priority"
✅ Green status: PENDING
✅ Red-bordered card (HIGH priority)
✅ Email badge shows "From Email"
✅ Sender email displayed at bottom

---

### Test 2: Multiple Email Sync

**Setup:**
1. Send 3 different emails with various priorities:

**Email 1:**
```
Subject: Fix Login Bug - URGENT
Body: Critical login button is broken. Needs immediate fix.
Priority: High
Deadline: 2026-03-14
```

**Email 2:**
```
Subject: Review Code Changes
Body: Please review the PR changes.
Priority: Medium
Deadline: 2026-03-18
```

**Email 3:**
```
Subject: Update Documentation
Body: Update API documentation with new endpoints.
Priority: Low
Deadline: 2026-03-25
```

**Steps:**
1. Click "Sync Gmail Tasks"
2. Enter credentials
3. Click "Sync Now"

**Expected Results:**
✅ Success: "Successfully synced 3 tasks"
✅ Three tasks appear with different colors:
  - High: Red border
  - Medium: Yellow border
  - Low: Green border
✅ Each shows correct deadline
✅ All marked as PENDING

---

### Test 3: Error Handling - Invalid Credentials

**Steps:**
1. Click "Sync Gmail Tasks"
2. Enter wrong app password
3. Click "Sync Now"

**Expected Results:**
✅ Error message displayed
✅ Red alert box appears
✅ Helpful message about credentials
✅ Task list not modified

---

### Test 4: Error Handling - Empty Fields

**Steps:**
1. Click "Sync Gmail Tasks"
2. Leave email field empty
3. Click "Sync Now"

**Expected Results:**
✅ "Please enter both email and app password" message
✅ Sync button disabled until email entered

---

### Test 5: No Unread Emails

**Setup:**
1. Mark all emails as read in Gmail
2. Ensure no unread emails exist

**Steps:**
1. Click "Sync Gmail Tasks"
2. Enter correct credentials
3. Click "Sync Now"

**Expected Results:**
✅ Success message: "Successfully synced 0 tasks from emails"
✅ No new tasks added
✅ Dashboard remains unchanged

---

### Test 6: Refresh Button

**Setup:**
1. Have at least one task on dashboard
2. Delete one task manually from another browser tab

**Steps:**
1. Click "Refresh" button
2. Wait for reload

**Expected Results:**
✅ Dashboard reloads
✅ Deleted task no longer appears
✅ Other tasks remain

---

### Test 7: Dialog Cancel

**Steps:**
1. Click "Sync Gmail Tasks"
2. Start entering credentials
3. Click "Cancel"

**Expected Results:**
✅ Dialog closes
✅ Entered credentials are cleared
✅ Dashboard shows no changes

---

### Test 8: Task Card Hover Animation

**Steps:**
1. Have tasks on dashboard
2. Move mouse over a task card
3. Observe the interaction

**Expected Results:**
✅ Card lifts slightly (translateY -5px)
✅ Shadow increases
✅ Smooth animation transition

---

### Test 9: Mobile Responsiveness

**Setup:**
1. Open DevTools (F12)
2. Toggle device toolbar
3. Select different device sizes

**Test Sizes:**
- iPhone 12 (390x844)
- iPad (768x1024)
- Desktop (1920x1080)

**Expected Results:**
✅ Layout adapts properly
✅ Grid adjusts: 1 column mobile, 2 columns tablet, 3 columns desktop
✅ Buttons remain clickable
✅ Dialog stays centered
✅ Text readable on all sizes

---

### Test 10: Console Logging

**Steps:**
1. Open DevTools Console (F12 → Console)
2. Perform sync operation
3. Check for errors

**Expected Results:**
✅ No JavaScript errors
✅ Backend API calls logged
✅ Successful response visible in Network tab
✅ No CORS errors

---

## Backend Testing

### Using cURL

**Test Email Sync Endpoint:**
```bash
curl -X POST http://localhost:8080/api/tasks/sync-emails \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"your.email@gmail.com\",\"appPassword\":\"xxxx xxxx xxxx xxxx\"}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Successfully synced 2 tasks from emails",
  "tasksCount": 2,
  "tasks": [
    {
      "id": 1,
      "title": "Example Task",
      "description": "...",
      "deadline": "2026-03-20T09:00:00",
      "priority": "HIGH",
      "status": "PENDING",
      "senderEmail": "sender@gmail.com"
    }
  ]
}
```

**Get All Tasks:**
```bash
curl http://localhost:8080/api/tasks
```

---

## AI Parsing Verification

### With OpenAI API

**Test 1: Structured Email**
```
Subject: Urgent: Database Migration - Due Monday (HIGH)
Body:
We need to migrate the database to PostgreSQL.
Timeline: Complete by Monday, March 17
This is critical for the project.
```

**Check:** Task created with correct values:
- ✅ Title extracted
- ✅ Deadline found
- ✅ Priority: HIGH
- ✅ Status: PENDING

### Without OpenAI API (Fallback)

**Test 1: Simple Email**
```
Subject: Review Documents
Body:
Please review the attached documents.
Priority: Medium
```

**Check:** Task created with fallback values:
- ✅ Title from subject
- ✅ Description from body
- ✅ Priority: MEDIUM
- ✅ Default deadline (7 days)
- ✅ Status: PENDING

---

## Performance Testing

### Load Testing

**Steps:**
1. Send 10+ emails to your inbox
2. Click "Sync Gmail Tasks"
3. Note sync time

**Expected Results:**
✅ Sync completes in <5 seconds for 10 emails
✅ No memory issues
✅ No timeout errors
✅ All tasks properly saved

### UI Responsiveness

**Steps:**
1. When syncing, click buttons/scroll
2. Observe UI doesn't freeze

**Expected Results:**
✅ UI remains responsive
✅ Sync happens in background
✅ Loading indicator shows
✅ Can still interact with page

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all buttons
- [ ] Enter key submits form
- [ ] Esc closes dialog
- [ ] Focus visible on all elements

### Screen Reader
- [ ] Dialog title announced
- [ ] Form labels read correctly
- [ ] Button purposes clear
- [ ] Error messages announced

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Expected Results for All Browsers:
✅ Email dialog opens/closes
✅ Forms submit correctly
✅ Tasks display properly
✅ Icons render
✅ No console errors

---

## Test Data Email Templates

### Template 1: Basic Task
```
Subject: Weekly Team Meeting - Friday 2PM
Body: We have our weekly standup on Friday at 2 PM.
Please prepare updates.
Deadline: Friday
Priority: Medium
```

### Template 2: Urgent Task
```
Subject: URGENT: Production Bug Fix
Body: Production server is down!
Database connections failing.
Need immediate fix.
Priority: HIGH
Deadline: 2026-03-14
```

### Template 3: Complex Task
```
Subject: Q1 Planning Session - Requires Attendance
Body:
Team: Please attend Q1 planning session
Date: March 28, 2026
Time: 2:00 PM - 4:00 PM
Location: Conference Room A

Prepare: Your department goals for Q1
Priority: High
Status: Pending
```

---

## Checklist: All Tests Passed

- [ ] Test 1: Basic Email Sync ✓
- [ ] Test 2: Multiple Emails ✓
- [ ] Test 3: Invalid Credentials Error ✓
- [ ] Test 4: Empty Fields Error ✓
- [ ] Test 5: No Unread Emails ✓
- [ ] Test 6: Refresh Works ✓
- [ ] Test 7: Cancel Dialog ✓
- [ ] Test 8: Hover Animation ✓
- [ ] Test 9: Mobile Responsive ✓
- [ ] Test 10: Console No Errors ✓
- [ ] Backend cURL Tests ✓
- [ ] AI Parsing Works ✓
- [ ] Performance Good ✓
- [ ] Accessibility OK ✓
- [ ] Browser Compatibility ✓

---

## 🎉 Ready for Production!

If all tests pass, your email sync feature is ready for:
✅ User testing
✅ Production deployment
✅ Team rollout

---

## Contact & Support

If you encounter issues:
1. Check [EMAIL_SYNC_SETUP.md](EMAIL_SYNC_SETUP.md) troubleshooting
2. Review backend logs
3. Check browser console (F12)
4. Verify credentials and configurations
