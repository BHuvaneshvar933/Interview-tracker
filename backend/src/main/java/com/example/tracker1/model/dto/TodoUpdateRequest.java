package com.example.tracker1.model.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class TodoUpdateRequest {
    private String title;
    private String description;
    private String category;
    private String priority; // LOW | MEDIUM | HIGH
    private LocalDate dueDate;
    private Boolean clearDueDate;
    private Boolean completed;
}
