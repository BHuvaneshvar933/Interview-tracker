package com.example.tracker1.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ProfessionalAnalyticsResponse {

    private AnalyticsOverviewResponse overview;

    private List<TrendPointResponse> appliedTrend;

    private List<TrendPointResponse> interviewTrend;

    private List<TrendPointResponse> offerTrend;

    private List<AgingBucketResponse> aging;

    private List<SourceBreakdownResponse> sources;

    private List<TopCompanyResponse> topCompanies;

    private List<TopSkillResponse> topSkills;

    private List<StageDurationBucketResponse> timeToInterview;

    private List<StageDurationBucketResponse> timeToOffer;
}
