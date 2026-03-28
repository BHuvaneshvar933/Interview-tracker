package com.example.tracker1.model.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "question_sets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewQuestionSet {

    @Id
    private String id;

    private String userEmail;
    private String resumeId;
    private String company;
    private String role;
    private String difficulty;
    private List<String> topics;
    private List<QuestionItem> questions;
    private Instant createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionItem {
        private String type;
        private String topic;
        private String difficulty;
        private String question;
        private String guidance;
    }
}
