package com.example.tracker1.model.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyzeResumeResponse {
    private String resumeId;
    private ResumeJobMatchResponse analysis;
}
