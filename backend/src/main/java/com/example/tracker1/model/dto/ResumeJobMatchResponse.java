package com.example.tracker1.model.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeJobMatchResponse {
    private int matchScore;
    private List<String> matchingSkills;
    private List<String> missingSkills;
    private String gapAnalysis;
    private List<String> suggestions;
    private List<String> keywordsToAdd;
}
