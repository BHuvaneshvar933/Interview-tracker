package com.example.tracker1.model.dto;

import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeListItemResponse {
    private String resumeId;
    private String fileName;
    private String contentType;
    private long fileSize;
    private Instant createdAt;
}
