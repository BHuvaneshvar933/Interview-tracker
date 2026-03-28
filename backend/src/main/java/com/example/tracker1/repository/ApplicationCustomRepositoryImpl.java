package com.example.tracker1.repository;

import com.example.tracker1.model.dto.*;
import com.example.tracker1.model.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class ApplicationCustomRepositoryImpl
        implements ApplicationCustomRepository {

    private final MongoTemplate mongoTemplate;

    @Override
    public PageResponse<Application> searchApplications(
            ApplicationSearchRequest request,
            String userId) {

        Query query = new Query();

        // Always filter by user
        query.addCriteria(Criteria.where("userId").is(userId));

        // Status filter
        if (request.getStatus() != null) {
            query.addCriteria(
                    Criteria.where("status")
                            .is(ApplicationStatus.valueOf(
                                    request.getStatus().toUpperCase()
                            ))
            );
        }

        // Company filter
        if (request.getCompany() != null) {
            query.addCriteria(
                    Criteria.where("company")
                            .regex(request.getCompany(), "i")
            );
        }

        // Date range filter
        if (request.getStartDate() != null &&
                request.getEndDate() != null) {

            query.addCriteria(
                    Criteria.where("appliedDate")
                            .gte(request.getStartDate())
                            .lte(request.getEndDate())
            );
        }

        // Keyword search (role + description)
        if (request.getKeyword() != null) {
            query.addCriteria(
                    new Criteria().orOperator(
                            Criteria.where("role")
                                    .regex(request.getKeyword(), "i"),
                            Criteria.where("jobDescription")
                                    .regex(request.getKeyword(), "i")
                    )
            );
        }

        // Skills filter
        if (request.getSkills() != null &&
                !request.getSkills().isEmpty()) {

            query.addCriteria(
                    Criteria.where("extractedSkills")
                            .in(request.getSkills())
            );
        }

        // Sorting
        Sort sort = request.getDirection().equalsIgnoreCase("desc")
                ? Sort.by(request.getSortBy()).descending()
                : Sort.by(request.getSortBy()).ascending();

        Pageable pageable = PageRequest.of(
                request.getPage(),
                request.getSize(),
                sort
        );

        long total = mongoTemplate.count(query, Application.class);

        query.with(pageable);

        List<Application> applications =
                mongoTemplate.find(query, Application.class);

        return PageResponse.<Application>builder()
                .content(applications)
                .page(pageable.getPageNumber())
                .size(pageable.getPageSize())
                .totalElements(total)
                .totalPages((int) Math.ceil((double) total / pageable.getPageSize()))
                .last((pageable.getOffset() + pageable.getPageSize()) >= total)
                .build();
    }
}
