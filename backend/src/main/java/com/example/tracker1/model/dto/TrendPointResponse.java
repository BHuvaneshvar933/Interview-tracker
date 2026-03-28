package com.example.tracker1.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TrendPointResponse {

    // Depending on grouping: yyyy-mm, yyyy-mm-dd
    private String period;
    private long count;
}
