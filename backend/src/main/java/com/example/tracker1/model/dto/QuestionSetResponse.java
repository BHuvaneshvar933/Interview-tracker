package com.example.tracker1.model.dto;

import lombok.*;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionSetResponse {
    private String questionSetId;
    private String resumeId;
    private String company;
    private String role;
    private String difficulty;
    private List<String> topics;
    private List<InterviewQuestionResponse> questions;
    private Instant createdAt;
}
