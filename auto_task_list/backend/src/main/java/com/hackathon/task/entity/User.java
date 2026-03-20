package com.hackathon.task.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;  // College email (e.g., name@college.edu)

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String password;  // In production, use bcrypt

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;  // STUDENT or STAFF

    // Student fields
    private Integer yearOfStudy;  // 1, 2, 3, 4
    private String course;  // B.Tech, B.Sc, M.Tech, etc.
    private String department;  // CSC, ECE, AIDS, AIML, BIOTECH, VLSI, CCE, CSBS
    private String registerNumber;  // Unique student registration number (e.g., REG/2024/001)
    private String phoneNumber;    // Student phone number

    // Staff fields
    private String position;  // Professor, Assistant Professor, etc.

    private String collegeType;  // college name/code
    private String gmailAppPassword;  // Gmail app password for email sync (encrypted in production)
    private String resetToken; // Token for password reset
    
    // Google OAuth 2.0 Tokens
    @Column(columnDefinition = "TEXT")
    private String googleAccessToken;
    
    @Column(columnDefinition = "TEXT")
    private String googleRefreshToken;

    public enum UserRole { STUDENT, STAFF }

    // Constructors
    public User() {}

    public User(String email, String name, String password, UserRole role) {
        this.email = email;
        this.name = name;
        this.password = password;
        this.role = role;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }

    public Integer getYearOfStudy() {
        return yearOfStudy;
    }

    public void setYearOfStudy(Integer yearOfStudy) {
        this.yearOfStudy = yearOfStudy;
    }

    public String getCourse() {
        return course;
    }

    public void setCourse(String course) {
        this.course = course;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getRegisterNumber() {
        return registerNumber;
    }

    public void setRegisterNumber(String registerNumber) {
        this.registerNumber = registerNumber;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public String getCollegeType() {
        return collegeType;
    }

    public void setCollegeType(String collegeType) {
        this.collegeType = collegeType;
    }

    public String getGmailAppPassword() {
        return gmailAppPassword;
    }

    public void setGmailAppPassword(String gmailAppPassword) {
        this.gmailAppPassword = gmailAppPassword;
    }

    public String getResetToken() {
        return resetToken;
    }

    public void setResetToken(String resetToken) {
        this.resetToken = resetToken;
    }

    public String getGoogleAccessToken() {
        return googleAccessToken;
    }

    public void setGoogleAccessToken(String googleAccessToken) {
        this.googleAccessToken = googleAccessToken;
    }

    public String getGoogleRefreshToken() {
        return googleRefreshToken;
    }

    public void setGoogleRefreshToken(String googleRefreshToken) {
        this.googleRefreshToken = googleRefreshToken;
    }
}
