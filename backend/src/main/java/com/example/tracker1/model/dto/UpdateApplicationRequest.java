package com.example.tracker1.model.dto;

import com.example.tracker1.model.entity.ApplicationStatus;
import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateApplicationRequest {

    private String company;

    private String role;

    private String jobDescription;

    private ApplicationStatus status;

    private LocalDate appliedDate;

    // Optional metadata
    private String source;

    private String jobUrl;

    private String location;

    private Integer salaryMin;

    private Integer salaryMax;

    private String currency;
}
