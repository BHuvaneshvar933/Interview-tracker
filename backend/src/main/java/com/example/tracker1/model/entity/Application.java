package com.example.tracker1.model.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.List;

@Document(collection = "applications")
@CompoundIndexes({
        @CompoundIndex(name = "user_status_idx",
                def = "{'userId': 1, 'status': 1}"),
        @CompoundIndex(name = "user_date_idx",
                def = "{'userId': 1, 'appliedDate': -1}")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Application {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String company;

    private String role;

    private String jobDescription;

    private List<String> extractedSkills;

    // Optional metadata to enable richer analytics.
    private ApplicationSource source;

    private String jobUrl;

    private String location;

    // Optional compensation info.
    private Integer salaryMin;

    private Integer salaryMax;

    private String currency;

    private ApplicationStatus status;

    // Status history for funnel + time-to-stage analytics.
    private List<ApplicationStatusEvent> statusHistory;

    private LocalDate appliedDate;

    private LocalDate lastUpdated;

    private List<Interview> interviews;
}
