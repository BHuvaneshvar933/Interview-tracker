package com.example.tracker1.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AgingBucketResponse {

    // eg "0-7", "8-14", "15-30", "31+"
    private String bucket;
    private long count;
}
