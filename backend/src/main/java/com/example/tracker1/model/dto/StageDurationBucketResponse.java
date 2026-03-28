package com.example.tracker1.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StageDurationBucketResponse {

    // eg "0-3", "4-7", "8-14", "15+"
    private String bucket;
    private long count;
}
