package com.example.tracker1.model.entity;

import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Interview {

    private String roundName;

    private LocalDate interviewDate;

    private InterviewResult result;

    private String notes;
}