package com.example.tracker1.model.dto;

import com.example.tracker1.model.entity.ApplicationStatus;
import com.example.tracker1.model.entity.Interview;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class ApplicationResponse {

    private String id;

    private String company;

    private String role;

    private String jobDescription;

    private List<String> extractedSkills;

    // Optional metadata
    private String source;

    private String jobUrl;

    private String location;

    private Integer salaryMin;

    private Integer salaryMax;

    private String currency;

    private ApplicationStatus status;

    private LocalDate appliedDate;

    private LocalDate lastUpdated;

    private List<Interview> interviews;
}
