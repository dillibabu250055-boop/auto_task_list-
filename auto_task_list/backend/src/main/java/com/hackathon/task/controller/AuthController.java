package com.hackathon.task.controller;

import com.hackathon.task.entity.User;
import com.hackathon.task.entity.Task;
import com.hackathon.task.repository.UserRepository;
import com.hackathon.task.service.GoogleTokenService;
import com.hackathon.task.service.GoogleService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;


@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {

    private final UserRepository userRepository;
    private final GoogleTokenService googleTokenService;
    private final GoogleService googleService;

    @Value("${spring.security.oauth2.client.registration.google.client-id}")
    private String googleClientId;

    public AuthController(UserRepository userRepository, GoogleTokenService googleTokenService, GoogleService googleService) {
        this.userRepository = userRepository;
        this.googleTokenService = googleTokenService;
        this.googleService = googleService;
    }

    @PostMapping("/google-sync")
    public ResponseEntity<Map<String, Object>> googleSync(@RequestBody Map<String, String> payload) {
        try {
            String accessToken = payload.get("accessToken");
            String email = payload.get("email");
            
            if (accessToken == null || accessToken.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Access token is required");
                return ResponseEntity.badRequest().body(error);
            }

            List<Task> syncedTasks = googleService.fetchEmailsWithOAuth(accessToken, email);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Synced " + syncedTasks.size() + " tasks from Gmail");
            response.put("tasks", syncedTasks);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Sync error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/google")
    public ResponseEntity<Map<String, Object>> googleLogin(@RequestBody Map<String, String> payload) {
        try {
            String code = payload.get("code");
            if (code == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Authorization code is required");
                return ResponseEntity.badRequest().body(error);
            }

            GoogleTokenResponse tokenResponse = googleTokenService.exchangeCodeForTokens(code);
            String idTokenString = tokenResponse.getIdToken();

            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Invalid ID token");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
            }

            GoogleIdToken.Payload googlePayload = idToken.getPayload();
            String email = googlePayload.getEmail();
            String name = (String) googlePayload.get("name");
            String accessToken = tokenResponse.getAccessToken();
            String refreshToken = tokenResponse.getRefreshToken();

            Optional<User> userOptional = userRepository.findByEmail(email);
            User user;
            if (userOptional.isPresent()) {
                user = userOptional.get();
            } else {
                user = new User();
                user.setEmail(email);
                user.setName(name);
                user.setPassword(UUID.randomUUID().toString()); // Placeholder password
                user.setRole(User.UserRole.STUDENT); // Default role
                user.setCollegeType("Unknown");
            }

            // Save tokens for future Gmail access
            if (accessToken != null) user.setGoogleAccessToken(accessToken);
            if (refreshToken != null) user.setGoogleRefreshToken(refreshToken);
            userRepository.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Login successful");
            response.put("user", userToMap(user));
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Google Login error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        try {
            String email = credentials.get("email");
            String password = credentials.get("password");

            if (email == null || email.isEmpty() || password == null || password.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Email and password are required");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            Optional<User> userOptional = userRepository.findByEmailAndPassword(email, password);

            if (userOptional.isPresent()) {
                User user = userOptional.get();
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Login successful");
                response.put("user", userToMap(user));
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Invalid email or password");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorResponse);
            }
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Login error: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody User user) {
        try {
            // Validate college email
            if (user.getEmail() == null || !user.getEmail().contains("@")) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Please use a valid college email");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Check if email already exists
            if (userRepository.existsByEmail(user.getEmail())) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Email already registered");
                return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
            }

            // Validate role
            if (user.getRole() == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "User role (STUDENT or STAFF) is required");
                return ResponseEntity.badRequest().body(errorResponse);
            }

            // Validate student fields
            if (user.getRole() == User.UserRole.STUDENT) {
                if (user.getYearOfStudy() == null || user.getCourse() == null || user.getDepartment() == null) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "For students: year of study, course, department, phone number, and register number are required");
                    return ResponseEntity.badRequest().body(errorResponse);
                }
                if (user.getPhoneNumber() == null || user.getPhoneNumber().isEmpty()) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "Phone number is required for students");
                    return ResponseEntity.badRequest().body(errorResponse);
                }
                if (user.getRegisterNumber() == null || user.getRegisterNumber().isEmpty()) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "Register number is required for students");
                    return ResponseEntity.badRequest().body(errorResponse);
                }
                if (user.getRegisterNumber().length() != 13) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "Register number must be exactly 13 characters");
                    return ResponseEntity.badRequest().body(errorResponse);
                }
            }

            // Validate staff fields
            if (user.getRole() == User.UserRole.STAFF) {
                if (user.getPosition() == null || user.getPosition().isEmpty()) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("success", false);
                    errorResponse.put("message", "For staff: position is required");
                    return ResponseEntity.badRequest().body(errorResponse);
                }
            }

            User savedUser = userRepository.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Registration successful");
            response.put("user", userToMap(savedUser));
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Registration error: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @GetMapping("/user/{id}")
    public ResponseEntity<Map<String, Object>> getUser(@PathVariable Long id) {
        try {
            Optional<User> userOptional = userRepository.findById(id);
            if (userOptional.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("user", userToMap(userOptional.get()));
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "User not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
            }
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Error fetching user: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            Optional<User> userOptional = userRepository.findByEmail(email);

            if (userOptional.isPresent()) {
                User user = userOptional.get();
                // In production, generate a secure token and send an email
                String token = UUID.randomUUID().toString();
                user.setResetToken(token);
                userRepository.save(user);

                // Mocking email sending for now
                System.out.println("Password reset token for " + email + ": " + token);

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Password reset instructions sent to your email");
                response.put("token", token); // Returning token for demonstration/easy testing
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Email not found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
            }
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> body) {
        try {
            String token = body.get("token");
            String newPassword = body.get("password");

            Optional<User> userOptional = userRepository.findByResetToken(token);

            if (userOptional.isPresent()) {
                User user = userOptional.get();
                user.setPassword(newPassword);
                user.setResetToken(null); // Clear the token
                userRepository.save(user);

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Password reset successfully");
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Invalid or expired reset token");
                return ResponseEntity.badRequest().body(errorResponse);
            }
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(errorResponse);
        }
    }

    private Map<String, Object> userToMap(User user) {
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("email", user.getEmail());
        userMap.put("name", user.getName());
        userMap.put("role", user.getRole());
        userMap.put("phoneNumber", user.getPhoneNumber());

        if (user.getRole() == User.UserRole.STUDENT) {
            userMap.put("yearOfStudy", user.getYearOfStudy());
            userMap.put("course", user.getCourse());
            userMap.put("department", user.getDepartment());
            userMap.put("registerNumber", user.getRegisterNumber());
        } else if (user.getRole() == User.UserRole.STAFF) {
            userMap.put("position", user.getPosition());
        }

        userMap.put("collegeType", user.getCollegeType());
        userMap.put("googleAccessToken", user.getGoogleAccessToken());
        // Note: gmailAppPassword should NOT be sent back to frontend for security reasons
        // Only store it for backend email sync operations
        return userMap;
    }
}
