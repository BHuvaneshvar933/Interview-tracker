package com.example.tracker1.service;

import com.example.tracker1.model.dto.*;
import java.util.List;

public interface ApplicationService {

    ApplicationResponse createApplication(CreateApplicationRequest request);

    PageResponse<ApplicationResponse> getAllApplications(
            int page,
            int size,
            String sortBy,
            String direction
    );

    PageResponse<ApplicationResponse> getApplicationsByStatus(
            String status,
            int page,
            int size,
            String sortBy,
            String direction
    );

    ApplicationResponse getById(String id);


    ApplicationResponse updateApplication(String id, UpdateApplicationRequest request);

    ApplicationResponse addInterview(String applicationId, InterviewRequest request);

    void deleteApplication(String id);

    PageResponse<ApplicationResponse> filterApplications(
            ApplicationFilterRequest filter,
            int page,
            int size,
            String sortBy,
            String direction
    );

    ApplicationAnalyticsResponse getAnalytics();
    List<MonthlyTrendResponse> getMonthlyTrend();

    ProfessionalAnalyticsResponse getProfessionalAnalytics(
            String from,
            String to,
            String groupBy,
            Integer topN
    );

    BackfillStatusHistoryResponse backfillStatusHistoryForCurrentUser();
    PageResponse<ApplicationResponse> searchApplications(
            String email,
            String company,
            String role,
            String status,
            int page,
            int size,
            String sortBy,
            String direction
    );


}
