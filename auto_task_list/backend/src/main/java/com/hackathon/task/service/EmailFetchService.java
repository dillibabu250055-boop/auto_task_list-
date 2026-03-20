package com.hackathon.task.service;

import com.hackathon.task.entity.Task;
import com.hackathon.task.repository.TaskRepository;
import jakarta.mail.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.util.*;

@Service
public class EmailFetchService {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private AiParsingService aiParsingService;

    private static final int MAX_EMAILS_TO_SYNC = 50;  // Fetch up to 50 recent emails for better coverage
    private static final int TIMEOUT_MS = 30000;  // 30 second timeout for Gmail IMAP

    public List<Task> fetchAndParseEmails(String userEmail, String appPassword) {
        List<Task> syncedTasks = new ArrayList<>();
        
        System.out.println("===== Starting Email Sync =====");
        System.out.println("Email: " + userEmail);
        
        try {
            Properties props = new Properties();
            props.put("mail.store.protocol", "imaps");
            props.put("mail.imaps.host", "imap.gmail.com");
            props.put("mail.imaps.port", "993");
            props.put("mail.imaps.starttls.enable", "true");
            props.put("mail.imaps.starttls.required", "true");
            props.put("mail.imaps.connectiontimeout", String.valueOf(TIMEOUT_MS));
            props.put("mail.imaps.timeout", String.valueOf(TIMEOUT_MS));
            
            Session session = Session.getInstance(props, null);
            Store store = session.getStore("imaps");
            store.connect("imap.gmail.com", userEmail, appPassword);

            Folder inbox = store.getFolder("INBOX");
            inbox.open(Folder.READ_ONLY);

            Message[] allMessages = inbox.getMessages();
            int totalMessages = allMessages.length;
            System.out.println("Total messages in inbox: " + totalMessages);
            
            int startIndex = Math.max(0, totalMessages - MAX_EMAILS_TO_SYNC);
            
            Message[] messages = new Message[Math.min(MAX_EMAILS_TO_SYNC, totalMessages)];
            int endIndex = startIndex + messages.length - 1;
            for (int i = 0; i < messages.length; i++) {
                messages[i] = allMessages[endIndex - i]; // newest first
            }

            for (int i = 0; i < messages.length; i++) {
                try {
                    Message message = messages[i];
                    String subject = message.getSubject() != null ? message.getSubject() : "(No Subject)";
                    String content = getTextFromMessage(message);
                    
                    if (content == null || content.trim().isEmpty()) continue;
                    
                    Address[] fromAddresses = message.getFrom();
                    String sender = (fromAddresses != null && fromAddresses.length > 0) ? fromAddresses[0].toString() : "Unknown";

                    String emailBody = "Subject: " + subject + "\n\nBody: " + content;
                    Task parsedTask = aiParsingService.parseEmailToTaskFast(emailBody);

                    if (parsedTask != null) {
                        parsedTask.setSenderEmail(sender);
                        parsedTask.setSyncedByEmail(userEmail);
                        
                        // Prevent duplicates: Check if task with same title and sender exists
                        boolean exists = taskRepository.findAll().stream().anyMatch(t -> 
                            t.getTitle().equals(parsedTask.getTitle()) && 
                            t.getSenderEmail().equals(sender)
                        );
                        
                        if (!exists) {
                            Task savedTask = taskRepository.save(parsedTask);
                            syncedTasks.add(savedTask);
                            System.out.println("✓ Task created: " + parsedTask.getTitle());
                        } else {
                            System.out.println("- Skipping existing task: " + parsedTask.getTitle());
                        }
                    }
                } catch (Exception e) {
                    System.err.println("⚠ Error processing email: " + e.getMessage());
                }
            }

            // TRIGGER BACKGROUND SYNC for earlier emails
            if (totalMessages > MAX_EMAILS_TO_SYNC) {
                int bgLimit = totalMessages - MAX_EMAILS_TO_SYNC;
                System.out.println(">>> Triggering background sync for remaining " + bgLimit + " emails...");
                fetchRemainingEmailsAsync(userEmail, appPassword);
            }

            inbox.close(false);
            store.close();
        } catch (Exception e) {
            System.err.println("===== Email Sync Failed: " + e.getMessage() + " =====");
            throw new RuntimeException("Email fetch failed: " + e.getMessage());
        }
        
        return syncedTasks;
    }

    @Async
    public void fetchRemainingEmailsAsync(String userEmail, String appPassword) {
        try {
            System.out.println("===== Starting BACKGROUND Email Sync =====");
            Properties props = new Properties();
            props.put("mail.store.protocol", "imaps");
            props.put("mail.imaps.host", "imap.gmail.com");
            props.put("mail.imaps.port", "993");
            props.put("mail.imaps.connectiontimeout", "60000");
            props.put("mail.imaps.timeout", "60000");

            Session session = Session.getInstance(props, null);
            Store store = session.getStore("imaps");
            store.connect("imap.gmail.com", userEmail, appPassword);

            Folder inbox = store.getFolder("INBOX");
            inbox.open(Folder.READ_ONLY);

            Message[] allMessages = inbox.getMessages();
            int totalMessages = allMessages.length;
            
            // Sync at most 100 more messages in background
            int startSyncAt = totalMessages - MAX_EMAILS_TO_SYNC - 1;
            int limitAt = Math.max(0, startSyncAt - 100);
            int countSyncing = 0;
            
            for (int i = startSyncAt; i >= limitAt; i--) {
                try {
                    Message message = allMessages[i];
                    String subject = message.getSubject() != null ? message.getSubject() : "(No Subject)";
                    String content = getTextFromMessage(message);
                    if (content == null || content.trim().isEmpty()) continue;
                    
                    Address[] fromAddresses = message.getFrom();
                    String sender = (fromAddresses != null && fromAddresses.length > 0) ? fromAddresses[0].toString() : "Unknown";

                    String emailBody = "Subject: " + subject + "\n\nBody: " + content;
                    Task parsedTask = aiParsingService.parseEmailToTaskFast(emailBody);

                    if (parsedTask != null) {
                        parsedTask.setSenderEmail(sender);
                        parsedTask.setSyncedByEmail(userEmail);
                        // Prevent duplicates: Check if task with same title and sender exists
                        final String taskTitle = parsedTask.getTitle();
                        final String taskSender = sender;
                        boolean exists = taskRepository.findAll().stream().anyMatch(t -> 
                            t.getTitle().equals(taskTitle) && t.getSenderEmail().equals(taskSender)
                        );
                        
                        if (!exists) {
                            taskRepository.save(parsedTask);
                            countSyncing++;
                        }
                        
                        if (countSyncing % 10 == 0 && countSyncing > 0) {
                             System.out.println("... Background Sync Progress: " + countSyncing + " tasks added");
                        }
                    }
                } catch (Exception e) { }
                
                // Add a small delay to avoid overwhelming the server/API
                try { Thread.sleep(100); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
            }

            inbox.close(false);
            store.close();
            System.out.println("===== BACKGROUND Email Sync Complete: " + countSyncing + " more tasks added =====");
        } catch (Exception e) {
            System.err.println("===== BACKGROUND Email Sync Failed: " + e.getMessage() + " =====");
        }
    }

    private String getTextFromMessage(Message message) throws MessagingException, IOException {
        try {
            if (message.isMimeType("text/plain")) {
                String content = (String) message.getContent();
                return content != null ? content.substring(0, Math.min(2000, content.length())) : "";
            } else if (message.isMimeType("text/html")) {
                String html = (String) message.getContent();
                String text = html.replaceAll("<[^>]*>", "").replaceAll("&nbsp;", " ");
                return text != null ? text.substring(0, Math.min(2000, text.length())) : "";
            } else if (message.isMimeType("multipart/*")) {
                StringBuilder content = new StringBuilder();
                Multipart multipart = (Multipart) message.getContent();
                for (int i = 0; i < Math.min(3, multipart.getCount()); i++) {
                    BodyPart part = multipart.getBodyPart(i);
                    if (part.isMimeType("text/plain")) {
                        String partContent = part.getContent().toString();
                        if (partContent != null) {
                            content.append(partContent.substring(0, Math.min(1500, partContent.length())));
                        }
                    }
                }
                return content.toString();
            }
            return "";
        } catch (Exception e) {
            return "[Could not retrieve email content]";
        }
    }
}