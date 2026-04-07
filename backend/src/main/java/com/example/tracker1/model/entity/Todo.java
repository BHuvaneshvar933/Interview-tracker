package com.example.tracker1.model.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Document(collection = "todos")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Todo {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String title;

    private String description;

    @Indexed
    private String category;

    @Indexed
    private TodoPriority priority;

    @Indexed
    private LocalDate dueDate;

    @Indexed
    private boolean completed;

    @Indexed
    private Instant completedAt;

    @Indexed
    private Instant createdAt;

    @Indexed
    private Instant updatedAt;
}
