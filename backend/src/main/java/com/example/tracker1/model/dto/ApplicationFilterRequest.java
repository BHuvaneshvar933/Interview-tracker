package com.example.tracker1.model.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class ApplicationFilterRequest {

    private String status;
    private String company;
    private String role;
    private String skill;
    private LocalDate fromDate;
    private LocalDate toDate;
}
