package com.example.tracker1.model.dto;

import lombok.Data;
import java.time.LocalDate;
import java.util.List;

@Data
public class ApplicationSearchRequest {

    private String status;
    private String company;
    private LocalDate startDate;
    private LocalDate endDate;
    private String keyword;
    private List<String> skills;

    private int page = 0;
    private int size = 10;
    private String sortBy = "appliedDate";
    private String direction = "desc";
}
