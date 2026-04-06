package com.hackathon.task.controller;

import com.hackathon.task.entity.Task;
import com.hackathon.task.repository.TaskRepository;
import com.hackathon.task.service.EmailFetchService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "http://localhost:3000")
public class TaskController {

    private final TaskRepository taskRepository;
    private final EmailFetchService emailFetchService;

    public TaskController(TaskRepository taskRepository, EmailFetchService emailFetchService) {
        this.taskRepository = taskRepository;
        this.emailFetchService = emailFetchService;
    }

    @GetMapping
    public List<Task> getAllTasks() {
        return taskRepository.findAll();
    }

    @PostMapping
    public Task createTask(@RequestBody Task task) {
        return taskRepository.save(task);
    }

    @PutMapping("/{id}")
    public Task updateTask(@PathVariable Long id, @RequestBody Task updatedTask) {
        return taskRepository.findById(id)
                .map(task -> {
                    task.setTitle(updatedTask.getTitle());
                    task.setDescription(updatedTask.getDescription());
                    task.setDeadline(updatedTask.getDeadline());
                    task.setPriority(updatedTask.getPriority());
                    task.setStatus(updatedTask.getStatus());
                    task.setSenderEmail(updatedTask.getSenderEmail());
                    task.setSyncedByEmail(updatedTask.getSyncedByEmail());
                    task.setCategory(updatedTask.getCategory());
                    return taskRepository.save(task);
                }).orElseThrow(() -> new RuntimeException("Task not found"));
    }

    @DeleteMapping("/{id}")
    public void deleteTask(@PathVariable Long id) {
        taskRepository.deleteById(id);
    }

    @DeleteMapping("/synced-by/{email}")
    public ResponseEntity<Map<String, Object>> deleteTasksByEmail(@PathVariable String email) {
        try {
            taskRepository.deleteBySyncedByEmail(email);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Tasks for " + email + " removed");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Failed to remove tasks: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/sync-emails")
    public ResponseEntity<Map<String, Object>> syncEmailTasks(@RequestBody Map<String, String> credentials) {
        try {
            String email = credentials.get("email");
            String appPassword = credentials.get("appPassword");
            
            List<Task> syncedTasks = emailFetchService.fetchAndParseEmails(email, appPassword);
            
            // Mark all foreground synced tasks with the owner email
            syncedTasks.forEach(t -> {
                t.setSyncedByEmail(email);
                taskRepository.save(t);
            });
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("count", syncedTasks.size());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Sync failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/email-settings")
    public ResponseEntity<Map<String, String>> getEmailSettings() {
        Map<String, String> settings = new HashMap<>();
        settings.put("info", "Use Gmail with App Password for authentication");
        settings.put("note", "Enable 2FA in Gmail and generate an App Password");
        return ResponseEntity.ok(settings);
    }
}