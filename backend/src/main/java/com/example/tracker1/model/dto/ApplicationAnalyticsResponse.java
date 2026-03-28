package com.example.tracker1.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class ApplicationAnalyticsResponse {

    private long totalApplications;

    private Map<String, Long> statusBreakdown;

    private long totalInterviews;

    private long offers;

    private long rejections;

    private double interviewConversionRate;

    private double offerConversionRate;

    // New fields (backward compatible)
    private Double medianDaysToInterview;
    private Double medianDaysToOffer;
}
