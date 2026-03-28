package com.example.tracker1.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SourceBreakdownResponse {

    private String source;
    private long count;
}
