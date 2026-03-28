package com.example.tracker1.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateApplicationRequest {



    @NotBlank
    private String company;

    @NotBlank
    private String role;

    @NotBlank
    private String jobDescription;

    private LocalDate appliedDate;

    // Optional metadata
    private String source;

    private String jobUrl;

    private String location;

    private Integer salaryMin;

    private Integer salaryMax;

    private String currency;
}
