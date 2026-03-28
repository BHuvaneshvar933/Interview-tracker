package com.example.tracker1.model.entity;

import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ApplicationStatusEvent {

    private ApplicationStatus status;

    // Date the application entered this status.
    private LocalDate date;

    // Optional note (eg. "HM screen scheduled").
    private String note;
}
