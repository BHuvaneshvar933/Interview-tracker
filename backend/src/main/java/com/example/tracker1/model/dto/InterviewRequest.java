package com.example.tracker1.model.dto;

import com.example.tracker1.model.entity.InterviewResult;
import lombok.Data;

import java.time.LocalDate;

@Data
public class InterviewRequest {

    private String roundName;

    private LocalDate interviewDate;

    private InterviewResult result;

    private String notes;
}