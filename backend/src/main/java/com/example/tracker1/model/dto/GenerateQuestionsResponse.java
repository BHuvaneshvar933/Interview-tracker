package com.example.tracker1.model.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateQuestionsResponse {
    private String difficulty;
    private List<String> topics;
    private List<InterviewQuestionResponse> questions;
}
