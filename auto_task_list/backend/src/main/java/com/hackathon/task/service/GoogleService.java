package com.hackathon.task.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import com.hackathon.task.entity.Task;
import com.hackathon.task.repository.TaskRepository;

@Service
public class GoogleService {

    private static final String APPLICATION_NAME = "Auto Task List";
    private static final JsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private AiParsingService aiParsingService;

    public List<Task> fetchEmailsWithOAuth(String accessToken, String ownerEmail) throws GeneralSecurityException, IOException {
        GoogleCredentials credentials = GoogleCredentials.create(new AccessToken(accessToken, null));
        Gmail service = new Gmail.Builder(GoogleNetHttpTransport.newTrustedTransport(), JSON_FACTORY, new HttpCredentialsAdapter(credentials))
                .setApplicationName(APPLICATION_NAME)
                .build();

        ListMessagesResponse response = service.users().messages().list("me").setMaxResults(20L).execute();
        List<Message> messages = response.getMessages();
        List<Task> syncedTasks = new ArrayList<>();

        if (messages != null) {
            // Use parallel stream for faster processing of multiple messages
            messages.parallelStream().forEach(message -> {
                try {
                    Message fullMessage = service.users().messages().get("me", message.getId()).execute();
                    String snippet = fullMessage.getSnippet();
                    
                    // Get subject from headers
                    String subject = fullMessage.getPayload().getHeaders().stream()
                            .filter(h -> h.getName().equalsIgnoreCase("Subject"))
                            .map(h -> h.getValue())
                            .findFirst().orElse("(No Subject)");

                    String sender = fullMessage.getPayload().getHeaders().stream()
                            .filter(h -> h.getName().equalsIgnoreCase("From"))
                            .map(h -> h.getValue())
                            .findFirst().orElse("Unknown");

                    String emailBody = "Subject: " + subject + "\n\nBody: " + snippet;
                    Task parsedTask = aiParsingService.parseEmailToTaskFast(emailBody);

                    if (parsedTask != null) {
                        parsedTask.setSenderEmail(sender);
                        parsedTask.setSyncedByEmail(ownerEmail);
                        synchronized (syncedTasks) {
                            // Prevent duplicates: Check if task with same title and sender exists
                            boolean exists = taskRepository.findAll().stream().anyMatch(t -> 
                                t.getTitle().equals(parsedTask.getTitle()) && 
                                t.getSenderEmail().equals(sender)
                            );
                            
                            if (!exists) {
                                Task savedTask = taskRepository.save(parsedTask);
                                syncedTasks.add(savedTask);
                            }
                        }
                    }
                } catch (IOException e) {
                    System.err.println("Error fetching Gmail message detail: " + e.getMessage());
                }
            });
        }
        return syncedTasks;
    }
}
