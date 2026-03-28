package com.example.tracker1.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GenerateQuestionsRequest {

    @NotBlank
    private String company;

    @NotBlank
    private String role;

    @NotBlank
    private String resumeId;

    // optional: EASY|MEDIUM|HARD|mixed
    private String difficulty;
}
