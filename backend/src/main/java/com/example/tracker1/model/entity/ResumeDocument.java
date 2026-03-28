package com.example.tracker1.model.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "resumes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeDocument {

    @Id
    private String id;

    private String userEmail;

    private String fileName;
    private String contentType;
    private long fileSize;

    // Extracted and cleaned plain text from PDF
    private String extractedText;

    private Instant createdAt;
}
