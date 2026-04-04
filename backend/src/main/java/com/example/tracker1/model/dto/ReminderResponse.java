package com.example.tracker1.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ReminderResponse {
    private String id;
    private String applicationId;
    private String interviewRoundName;
    private String title;
    private String message;
    private Instant remindAt;
    private String status;
}
