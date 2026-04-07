package com.example.tracker1.model.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
public class TodoResponse {
    private String id;
    private String title;
    private String description;
    private String category;
    private String priority;
    private LocalDate dueDate;
    private boolean completed;
    private Instant completedAt;
    private Instant createdAt;
    private Instant updatedAt;
}
