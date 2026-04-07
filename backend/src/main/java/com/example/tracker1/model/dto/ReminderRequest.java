package com.example.tracker1.model.dto;

import lombok.Data;

import java.time.Instant;

@Data
public class ReminderRequest {
    private String applicationId;
    private String todoId;
    private String interviewRoundName;
    private String title;
    private String message;
    private Instant remindAt;
}
