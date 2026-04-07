package com.example.tracker1.model.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "reminders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reminder {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String applicationId;

    @Indexed
    private String todoId;

    // Optional link to a specific interview (by index or round name). Keep flexible for now.
    private String interviewRoundName;

    private String title;

    private String message;

    @Indexed
    private Instant remindAt;

    @Indexed
    private ReminderStatus status;

    private String channel; // PUSH, EMAIL, BOTH (future)

    @Indexed
    private Instant createdAt;

    private Instant sentAt;
}
