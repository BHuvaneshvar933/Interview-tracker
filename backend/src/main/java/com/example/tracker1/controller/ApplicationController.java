package com.example.tracker1.controller;

import com.example.tracker1.model.dto.*;
import com.example.tracker1.service.ApplicationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applications")
@RequiredArgsConstructor

public class ApplicationController {

    private final ApplicationService applicationService;

    // Endpoints
    @PostMapping
    public ResponseEntity<ApplicationResponse> createApplication(
            @Valid @RequestBody CreateApplicationRequest request) {
        ApplicationResponse response =
                applicationService.createApplication(request);

        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<PageResponse<ApplicationResponse>> getAllApplications(

            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "appliedDate") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        PageResponse<ApplicationResponse> response =
                applicationService.getAllApplications(
                        page,
                        size,
                        sortBy,
                        direction
                );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApplicationResponse> getById(
            @PathVariable String id
    ) {

        ApplicationResponse response = applicationService.getById(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    public ResponseEntity<PageResponse<ApplicationResponse>> getApplicationsByStatus(

            @RequestParam String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "appliedDate") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {
        PageResponse<ApplicationResponse> response =
                applicationService.getApplicationsByStatus(
                        status,
                        page,
                        size,
                        sortBy,
                        direction
                );

        return ResponseEntity.ok(response);
    }


    @PutMapping("/{id}")
    public ResponseEntity<ApplicationResponse> updateApplication(
            @PathVariable String id,
            @RequestBody UpdateApplicationRequest request) {
        ApplicationResponse response =
                applicationService.updateApplication(id, request);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/interviews")
    public ResponseEntity<ApplicationResponse> addInterview(
            @PathVariable String id,
            @RequestBody InterviewRequest request) {
        ApplicationResponse response =
                applicationService.addInterview(id, request);

        return ResponseEntity.ok(response);
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable String id) {
        applicationService.deleteApplication(id);

        return ResponseEntity.noContent().build();
    }

    @GetMapping("/filter")
    public PageResponse<ApplicationResponse> filterApplications(
            ApplicationFilterRequest filter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "appliedDate") String sortBy,
            @RequestParam(defaultValue = "desc") String direction) {

        return applicationService.filterApplications(
                filter,
                page,
                size,
                sortBy,
                direction
        );
    }

    @GetMapping("/analytics")
    public ApplicationAnalyticsResponse getAnalytics() {
        return applicationService.getAnalytics();
    }

    @GetMapping("/analytics/monthly")
    public List<MonthlyTrendResponse> getMonthlyTrend() {
        return applicationService.getMonthlyTrend();
    }

    // Professional analytics endpoint with filtering + segmentation.
    // Example: /api/applications/analytics/pro?from=2026-01-01&to=2026-03-31&groupBy=month&topN=10
    @GetMapping("/analytics/pro")
    public ProfessionalAnalyticsResponse getProfessionalAnalytics(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(defaultValue = "month") String groupBy,
            @RequestParam(defaultValue = "10") Integer topN
    ) {
        return applicationService.getProfessionalAnalytics(from, to, groupBy, topN);
    }

    @PostMapping("/migrations/backfill-status-history")
    public BackfillStatusHistoryResponse backfillStatusHistory() {
        return applicationService.backfillStatusHistoryForCurrentUser();
    }

    @GetMapping("/search")
    public PageResponse<ApplicationResponse> searchApplications(

            @RequestParam(required = false) String company,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,

            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "appliedDate") String sortBy,
            @RequestParam(defaultValue = "desc") String direction,

            Authentication authentication
    ) {

        String email = authentication.getName();

        return applicationService.searchApplications(
                email,
                company,
                role,
                status,
                page,
                size,
                sortBy,
                direction
        );
    }


}
