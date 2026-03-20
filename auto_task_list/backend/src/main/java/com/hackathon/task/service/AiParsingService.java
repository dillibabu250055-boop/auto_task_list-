package com.hackathon.task.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hackathon.task.entity.Task;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class AiParsingService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.openai.api-key:}")
    private String apiKey;

    public Task parseEmailToTask(String emailBody) {
        try {
            // Simplified check: only fallback if it's the placeholder or empty
            if (apiKey == null || apiKey.isEmpty() || apiKey.contains("your-api-key-here")) {
                return parseWithFallback(emailBody);
            }
            return parseWithOpenAI(emailBody);
        } catch (Exception e) {
            System.err.println("Error with AI parsing, falling back to smart parsing: " + e.getMessage());
            return parseWithFallback(emailBody);
        }
    }

    public Task parseEmailToTaskFast(String emailBody) {
        // Fast mode uses enhanced fallback for better performance during bulk sync
        return parseWithFallback(emailBody);
    }

    private Task parseWithOpenAI(String emailBody) throws Exception {
        RestTemplate restTemplate = new RestTemplate();

        String formattedPrompt = String.format(
            "Extract task information from this email and return ONLY a valid JSON object:\n\n%s\n\n" +
            "Rules:\n" +
            "1. 'description' must be exactly 3 bullet points (•).\n" +
            "2. 'deadline' must be YYYY-MM-DDTHH:mm:ss based on text. If no year, assume 2026.\n" +
            "3. 'priority' must be HIGH, MEDIUM, or LOW.\n" +
            "Return JSON:\n" +
            "{\n" +
            "  \"title\": \"title\",\n" +
            "  \"description\": \"• p1\\n• p2\\n• p3\",\n" +
            "  \"deadline\": \"ISO_DATE\",\n" +
            "  \"priority\": \"HIGH|MEDIUM|LOW\",\n" +
            "  \"status\": \"PENDING\"\n" +
            "}",
            emailBody);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + apiKey);

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", "gpt-3.5-turbo");
        requestBody.put("messages", new Object[]{
            Map.of("role", "user", "content", formattedPrompt)
        });
        requestBody.put("temperature", 0.2);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(
                "https://api.openai.com/v1/chat/completions", entity, String.class);

        if (response.getStatusCode().is2xxSuccessful()) {
            JsonNode root = objectMapper.readTree(response.getBody());
            String content = root.path("choices").get(0).path("message").path("content").asText();
            content = content.replace("```json", "").replace("```", "").trim();
            JsonNode taskJson = objectMapper.readTree(content);

            Task task = new Task();
            task.setTitle(taskJson.get("title").asText("New Task"));
            task.setDescription(taskJson.get("description").asText("Email update"));
            task.setDeadline(parseDeadline(taskJson.get("deadline").asText("")));
            
            String p = taskJson.get("priority").asText("MEDIUM").toUpperCase();
            task.setPriority(Task.Priority.valueOf(p));
            task.setStatus(Task.Status.PENDING);
            return task;
        }
        return parseWithFallback(emailBody);
    }

    private Task parseWithFallback(String emailBody) {
        Task task = new Task();
        String lowerBody = emailBody.toLowerCase();
        
        // 1. Better Title Extraction
        String title = "New Task";
        String[] lines = emailBody.split("\n");
        for (String line : lines) {
            if (line.startsWith("Subject:")) {
                title = line.replace("Subject:", "").trim();
                break;
            }
        }
        task.setTitle(title);

        // 2. Comprehensive Priority Detection
        if (lowerBody.contains("urgent") || lowerBody.contains("asap") || lowerBody.contains("immediately") || 
            lowerBody.contains("important") || lowerBody.contains("critical") || lowerBody.contains("exam")) {
            task.setPriority(Task.Priority.HIGH);
        } else if (lowerBody.contains("later") || lowerBody.contains("low priority") || lowerBody.contains("optional") || lowerBody.contains("fyi")) {
            task.setPriority(Task.Priority.LOW);
        } else {
            task.setPriority(Task.Priority.MEDIUM);
        }

        // 3. SMART DEADLINE EXTRACTION
        LocalDateTime deadline = findDeadlineInText(emailBody);
        
        if (deadline == null) {
            // Priority-based spreading fallback
            int offsetDays = (task.getPriority() == Task.Priority.HIGH) ? 2 : 
                            (task.getPriority() == Task.Priority.MEDIUM) ? 5 : 10;
            
            // Add jitter based on title to avoid all tasks having exact same time
            int jitter = Math.abs(title.hashCode() % 24); 
            deadline = LocalDateTime.now().plusDays(offsetDays).withHour(9).withMinute(0).withSecond(0).plusHours(jitter);
        }
        task.setDeadline(deadline);

        // 4. Description Cleaning
        String desc = emailBody.replace("Subject: " + title, "").trim();
        if (desc.contains("Body:")) desc = desc.substring(desc.indexOf("Body:") + 5).trim();
        task.setDescription(desc.substring(0, Math.min(1000, desc.length())));
        task.setStatus(Task.Status.PENDING);

        return task;
    }

    private LocalDateTime findDeadlineInText(String text) {
        String lowerText = text.toLowerCase();
        
        // Match "tomorrow"
        if (lowerText.contains("tomorrow")) {
            return LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.of(17, 0));
        }
        
        // Match specific days of week
        for (DayOfWeek day : DayOfWeek.values()) {
            String dayName = day.name().toLowerCase();
            if (lowerText.contains("by " + dayName) || lowerText.contains("next " + dayName)) {
                return LocalDateTime.of(LocalDate.now().with(TemporalAdjusters.next(day)), LocalTime.of(17, 0));
            }
        }

        // Match ISO looking dates (YYYY-MM-DD)
        Matcher isoMatcher = Pattern.compile("(\\d{4})-(\\d{1,2})-(\\d{1,2})").matcher(text);
        if (isoMatcher.find()) {
            try {
                return LocalDateTime.of(LocalDate.parse(isoMatcher.group()), LocalTime.of(9, 0));
            } catch (Exception e) {}
        }

        // Match common date formats (DD/MM or MM/DD)
        Matcher slashMatcher = Pattern.compile("(\\d{1,2})/(\\d{1,2})").matcher(text);
        if (slashMatcher.find()) {
            try {
                int first = Integer.parseInt(slashMatcher.group(1));
                int second = Integer.parseInt(slashMatcher.group(2));
                // Assume MM/DD if first is <= 12, else DD/MM
                int month = (first <= 12) ? first : second;
                int day = (first <= 12) ? second : first;
                return LocalDateTime.of(2026, month, day, 9, 0);
            } catch (Exception e) {}
        }

        // Match patterns like "Due: Nov 5" or "Deadline: 10 Jan"
        Pattern monthPattern = Pattern.compile("(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\\s+(\\d{1,2})", Pattern.CASE_INSENSITIVE);
        Matcher monthMatcher = monthPattern.matcher(text);
        if (monthMatcher.find()) {
            String monthName = monthMatcher.group(1);
            int day = Integer.parseInt(monthMatcher.group(2));
            int month = getMonthNumber(monthName);
            return LocalDateTime.of(2026, month, day, 12, 0);
        }

        return null;
    }

    private int getMonthNumber(String name) {
        String n = name.toLowerCase();
        if (n.startsWith("jan")) return 1;
        if (n.startsWith("feb")) return 2;
        if (n.startsWith("mar")) return 3;
        if (n.startsWith("apr")) return 4;
        if (n.startsWith("may")) return 5;
        if (n.startsWith("jun")) return 6;
        if (n.startsWith("jul")) return 7;
        if (n.startsWith("aug")) return 8;
        if (n.startsWith("sep")) return 9;
        if (n.startsWith("oct")) return 10;
        if (n.startsWith("nov")) return 11;
        if (n.startsWith("dec")) return 12;
        return 1;
    }

    private LocalDateTime parseDeadline(String dateString) {
        if (dateString == null || dateString.isEmpty()) return null;
        try {
            if (dateString.contains("T")) return LocalDateTime.parse(dateString, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            return LocalDateTime.of(LocalDate.parse(dateString), LocalTime.of(9, 0));
        } catch (Exception e) {
            return null;
        }
    }
}
