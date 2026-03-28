package com.example.tracker1.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class AnalyticsOverviewResponse {

    private long totalApplications;

    // Current status snapshot counts.
    private Map<String, Long> currentStatusCounts;

    // Funnel counts based on status history ("reached" stage at least once).
    private Map<String, Long> reachedStageCounts;

    private double interviewRate;
    private double offerRate;

    // Median days from APPLIED -> INTERVIEW / OFFER (where available)
    private Double medianDaysToInterview;
    private Double medianDaysToOffer;
}
