package com.example.tracker1.model.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewQuestionResponse {
    private String type; // TECHNICAL|BEHAVIORAL|COMPANY
    private String topic;
    private String difficulty; // EASY|MEDIUM|HARD
    private String question;
    private String guidance;
}
