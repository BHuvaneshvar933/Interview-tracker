package com.example.tracker1.model.dto;

import lombok.*;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateQuestionsApiResponse {
    private String questionSetId;
    private String resumeId;
    private String company;
    private String role;
    private Instant createdAt;
    private GenerateQuestionsResponse payload;
}
