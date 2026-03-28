package com.example.tracker1.service;

import com.example.tracker1.exception.ResourceNotFoundException;
import com.example.tracker1.model.dto.*;
import com.example.tracker1.model.entity.*;
import com.example.tracker1.repository.ApplicationRepository;
import com.example.tracker1.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.bson.Document;
import org.springframework.data.mongodb.core.aggregation.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.data.domain.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Criteria;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ApplicationServiceImpl implements ApplicationService {

    private final ApplicationRepository repository;
    private final SkillExtractionService skillExtractionService;

    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;

    private String getCurrentUserEmail() {
        Object principal = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getPrincipal();

        if (principal instanceof UserDetails userDetails) {
            return userDetails.getUsername();
        }

        return principal.toString();
    }
    private User getCurrentUser() {
        String email = getCurrentUserEmail();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }


    // Methods
    @Override
    public ApplicationResponse createApplication(CreateApplicationRequest request) {
        User user = getCurrentUser();
        List<String> skills =
                skillExtractionService.extractSkills(request.getJobDescription());

        LocalDate appliedDate = request.getAppliedDate() != null
                ? request.getAppliedDate()
                : LocalDate.now();

        ApplicationSource source = parseSource(request.getSource());

        Application application = Application.builder()
                .userId(user.getId())
                .company(request.getCompany())
                .role(request.getRole())
                .jobDescription(request.getJobDescription())
                .extractedSkills(skills)
                .source(source)
                .jobUrl(request.getJobUrl())
                .location(request.getLocation())
                .salaryMin(request.getSalaryMin())
                .salaryMax(request.getSalaryMax())
                .currency(request.getCurrency())
                .status(ApplicationStatus.APPLIED)
                .statusHistory(List.of(
                        ApplicationStatusEvent.builder()
                                .status(ApplicationStatus.APPLIED)
                                .date(appliedDate)
                                .note("created")
                                .build()
                ))
                .appliedDate(appliedDate)
                .lastUpdated(LocalDate.now())
                .interviews(new ArrayList<>())
                .build();

        Application saved = repository.save(application);

        return mapToResponse(saved);
    }

    @Override
    public PageResponse<ApplicationResponse> getAllApplications(
            int page,
            int size,
            String sortBy,
            String direction) {

        User user = getCurrentUser();

        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Application> pageResult =
                repository.findByUserId(user.getId(), pageable);

        List<ApplicationResponse> content =
                pageResult.getContent()
                        .stream()
                        .map(this::mapToResponse)
                        .toList();

        return PageResponse.<ApplicationResponse>builder()
                .content(content)
                .page(pageResult.getNumber())
                .size(pageResult.getSize())
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .last(pageResult.isLast())
                .build();
    }


    @Override
    public PageResponse<ApplicationResponse> getApplicationsByStatus(
            String status,
            int page,
            int size,
            String sortBy,
            String direction) {

        User user = getCurrentUser();

        ApplicationStatus applicationStatus =
                ApplicationStatus.valueOf(status.toUpperCase());

        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Application> pageResult =
                repository.findByUserIdAndStatus(
                        user.getId(),
                        applicationStatus,
                        pageable
                );

        List<ApplicationResponse> content =
                pageResult.getContent()
                        .stream()
                        .map(this::mapToResponse)
                        .toList();

        return PageResponse.<ApplicationResponse>builder()
                .content(content)
                .page(pageResult.getNumber())
                .size(pageResult.getSize())
                .totalElements(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .last(pageResult.isLast())
                .build();
    }

    public ApplicationResponse getById(String id) {
        User user = getCurrentUser();
        Application app = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found"));

        if (!app.getUserId().equals(user.getId())) {
            throw new AccessDeniedException("Unauthorized access");
        }

        return mapToResponse(app);
    }



    @Override
    public ApplicationResponse updateApplication(String id, UpdateApplicationRequest request) {

        User user = getCurrentUser();
        Application application = repository.findById(id)
                .orElseThrow(() ->  new ResourceNotFoundException("Application not found with id: " + id));

        if (!application.getUserId().equals(user.getId())) {
            throw new AccessDeniedException("Unauthorized access");
        }
        if (request.getCompany() != null)
            application.setCompany(request.getCompany());

        if (request.getRole() != null)
            application.setRole(request.getRole());

        if (request.getJobDescription() != null) {
            application.setJobDescription(request.getJobDescription());

            // Re-extract skills if JD changed
            List<String> skills =
                    skillExtractionService.extractSkills(request.getJobDescription());

            application.setExtractedSkills(skills);
        }

        if (request.getSource() != null) {
            application.setSource(parseSource(request.getSource()));
        }

        if (request.getJobUrl() != null) application.setJobUrl(request.getJobUrl());
        if (request.getLocation() != null) application.setLocation(request.getLocation());
        if (request.getSalaryMin() != null) application.setSalaryMin(request.getSalaryMin());
        if (request.getSalaryMax() != null) application.setSalaryMax(request.getSalaryMax());
        if (request.getCurrency() != null) application.setCurrency(request.getCurrency());

        if (request.getStatus() != null) {
            ApplicationStatus newStatus = request.getStatus();
            if (application.getStatus() != newStatus) {
                application.setStatus(newStatus);
                addStatusEvent(application, newStatus, LocalDate.now(), "updated");
            }
        }

        if (request.getAppliedDate() != null)
            application.setAppliedDate(request.getAppliedDate());

        application.setLastUpdated(LocalDate.now());

        Application saved = repository.save(application);

        return mapToResponse(saved);
    }

    @Override
    public ApplicationResponse addInterview(String applicationId, InterviewRequest request) {

        User user = getCurrentUser();
        Application application = repository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + applicationId));

        if (!application.getUserId().equals(user.getId())) {
            throw new AccessDeniedException("Unauthorized access");
        }

        Interview interview = Interview.builder()
                .roundName(request.getRoundName())
                .interviewDate(request.getInterviewDate())
                .result(request.getResult())
                .notes(request.getNotes())
                .build();

        application.getInterviews().add(interview);

        // If an interview is added and status is still APPLIED/OA, move to INTERVIEW.
        if (application.getStatus() == ApplicationStatus.APPLIED
                || application.getStatus() == ApplicationStatus.OA) {
            application.setStatus(ApplicationStatus.INTERVIEW);
            addStatusEvent(application, ApplicationStatus.INTERVIEW,
                    request.getInterviewDate() != null ? request.getInterviewDate() : LocalDate.now(),
                    "interview added");
        }

        application.setLastUpdated(LocalDate.now());

        Application saved = repository.save(application);

        return mapToResponse(saved);
    }

    @Override
    public void deleteApplication(String id) {
        User user = getCurrentUser();

        Application application = repository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Application not found"));

        if (!application.getUserId().equals(user.getId())) {
            throw new AccessDeniedException("Unauthorized access");
        }

        repository.delete(application);
    }

    @Override
    public PageResponse<ApplicationResponse> filterApplications(
            ApplicationFilterRequest filter,
            int page,
            int size,
            String sortBy,
            String direction) {

        User user = getCurrentUser();

        Query query = new Query();

        // 🔐 Always restrict by user
        query.addCriteria(Criteria.where("userId").is(user.getId()));

        if (filter.getStatus() != null) {
            query.addCriteria(Criteria.where("status")
                    .is(ApplicationStatus.valueOf(filter.getStatus().toUpperCase())));
        }

        if (filter.getCompany() != null) {
            query.addCriteria(Criteria.where("company")
                    .regex(filter.getCompany(), "i"));
        }

        if (filter.getRole() != null) {
            query.addCriteria(Criteria.where("role")
                    .regex(filter.getRole(), "i"));
        }

        if (filter.getSkill() != null) {
            query.addCriteria(Criteria.where("extractedSkills")
                    .in(filter.getSkill()));
        }

        if (filter.getFromDate() != null && filter.getToDate() != null) {
            query.addCriteria(Criteria.where("appliedDate")
                    .gte(filter.getFromDate())
                    .lte(filter.getToDate()));
        }

        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        query.with(sort);
        query.with(PageRequest.of(page, size));

        List<Application> applications =
                mongoTemplate.find(query, Application.class);

        long total =
                mongoTemplate.count(Query.of(query).limit(-1).skip(-1),
                        Application.class);

        List<ApplicationResponse> content =
                applications.stream()
                        .map(this::mapToResponse)
                        .toList();

        return PageResponse.<ApplicationResponse>builder()
                .content(content)
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages((int) Math.ceil((double) total / size))
                .last((page + 1) * size >= total)
                .build();
    }

    @Override
    public ApplicationAnalyticsResponse getAnalytics() {

        User user = getCurrentUser();

        MatchOperation matchUser =
                Aggregation.match(Criteria.where("userId").is(user.getId()));

        // Group by status
        GroupOperation groupByStatus =
                Aggregation.group("status")
                        .count().as("count");

        Aggregation aggregation =
                Aggregation.newAggregation(matchUser, groupByStatus);

        List<Document> results =
                mongoTemplate.aggregate(
                        aggregation,
                        "applications",
                        Document.class
                ).getMappedResults();

        long totalApplications = 0;
        long offers = 0;
        long rejections = 0;
        long interviews = 0;

        Map<String, Long> statusMap = new HashMap<>();

        for (Document doc : results) {
            String status = doc.getString("_id");
            Number countNumber = (Number) doc.get("count");
            long count = countNumber == null ? 0L : countNumber.longValue();

            statusMap.put(status, count);
            totalApplications += count;

            if ("OFFER".equals(status)) offers = count;
            if ("REJECTED".equals(status)) rejections = count;
            if ("INTERVIEW".equals(status)) interviews = count;
        }

        double interviewRate =
                totalApplications == 0 ? 0 :
                        (double) interviews / totalApplications * 100;

        double offerRate =
                totalApplications == 0 ? 0 :
                        (double) offers / totalApplications * 100;

        return ApplicationAnalyticsResponse.builder()
                .totalApplications(totalApplications)
                .statusBreakdown(statusMap)
                .totalInterviews(interviews)
                .offers(offers)
                .rejections(rejections)
                .interviewConversionRate(interviewRate)
                .offerConversionRate(offerRate)
                .medianDaysToInterview(medianDaysToStage(loadAppsForUser(user.getId(), null, null), ApplicationStatus.INTERVIEW))
                .medianDaysToOffer(medianDaysToStage(loadAppsForUser(user.getId(), null, null), ApplicationStatus.OFFER))
                .build();
    }

    @Override
    public List<MonthlyTrendResponse> getMonthlyTrend() {

        String email = getCurrentUserEmail();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        MatchOperation matchUser =
                Aggregation.match(Criteria.where("userId").is(user.getId()));

        ProjectionOperation projectMonth =
                Aggregation.project()
                        .andExpression("dateToString('%Y-%m', appliedDate)")
                        .as("month");

        GroupOperation groupByMonth =
                Aggregation.group("month")
                        .count().as("count");

        SortOperation sortByMonth =
                Aggregation.sort(Sort.by(Sort.Direction.ASC, "_id"));

        Aggregation aggregation =
                Aggregation.newAggregation(
                        matchUser,
                        projectMonth,
                        groupByMonth,
                        sortByMonth
                );

        List<Document> results =
                mongoTemplate.aggregate(
                        aggregation,
                        "applications",
                        Document.class
                ).getMappedResults();

        return results.stream()
                .map(doc -> MonthlyTrendResponse.builder()
                        .month(doc.getString("_id"))
                        .count(((Number) doc.get("count")).longValue())
                        .build())
                .toList();
    }

    @Override
    public ProfessionalAnalyticsResponse getProfessionalAnalytics(
            String from,
            String to,
            String groupBy,
            Integer topN
    ) {
        User user = getCurrentUser();

        LocalDate fromDate = parseDateOrNull(from);
        LocalDate toDate = parseDateOrNull(to);

        List<Application> apps = loadAppsForUser(user.getId(), fromDate, toDate);

        int n = (topN == null || topN <= 0) ? 10 : Math.min(topN, 50);
        String grouping = (groupBy == null || groupBy.isBlank()) ? "month" : groupBy.trim().toLowerCase();

        AnalyticsOverviewResponse overview = buildOverview(apps);

        return ProfessionalAnalyticsResponse.builder()
                .overview(overview)
                .appliedTrend(buildTrend(apps, grouping, fromDate, toDate, TrendType.APPLIED))
                .interviewTrend(buildTrend(apps, grouping, fromDate, toDate, TrendType.INTERVIEW))
                .offerTrend(buildTrend(apps, grouping, fromDate, toDate, TrendType.OFFER))
                .aging(buildAging(apps))
                .sources(buildSources(apps))
                .topCompanies(buildTopCompanies(apps, n))
                .topSkills(buildTopSkills(apps, n))
                .timeToInterview(buildTimeToStageBuckets(apps, ApplicationStatus.INTERVIEW))
                .timeToOffer(buildTimeToStageBuckets(apps, ApplicationStatus.OFFER))
                .build();
    }

    @Override
    public BackfillStatusHistoryResponse backfillStatusHistoryForCurrentUser() {
        User user = getCurrentUser();
        List<Application> apps = loadAppsForUser(user.getId(), null, null);

        long scanned = apps.size();
        long updated = 0;

        for (Application app : apps) {
            List<ApplicationStatusEvent> history = app.getStatusHistory();
            if (history != null && !history.isEmpty()) {
                continue;
            }

            LocalDate applied = app.getAppliedDate();
            if (applied == null) {
                applied = app.getLastUpdated() != null ? app.getLastUpdated() : LocalDate.now();
                app.setAppliedDate(applied);
            }

            List<ApplicationStatusEvent> newHistory = new ArrayList<>();
            newHistory.add(ApplicationStatusEvent.builder()
                    .status(ApplicationStatus.APPLIED)
                    .date(applied)
                    .note("backfilled")
                    .build());

            // If interviews exist, infer INTERVIEW reached from earliest interview date.
            LocalDate firstInterviewDate = null;
            if (app.getInterviews() != null) {
                for (Interview i : app.getInterviews()) {
                    if (i == null || i.getInterviewDate() == null) continue;
                    if (firstInterviewDate == null || i.getInterviewDate().isBefore(firstInterviewDate)) {
                        firstInterviewDate = i.getInterviewDate();
                    }
                }
            }
            if (firstInterviewDate != null) {
                newHistory.add(ApplicationStatusEvent.builder()
                        .status(ApplicationStatus.INTERVIEW)
                        .date(firstInterviewDate)
                        .note("backfilled from interviews")
                        .build());
            }

            // If current status is beyond APPLIED, add a terminal/current event.
            ApplicationStatus current = app.getStatus();
            if (current != null && current != ApplicationStatus.APPLIED) {
                LocalDate eventDate = app.getLastUpdated() != null ? app.getLastUpdated() : applied;
                // Ensure the event date is not before applied.
                if (eventDate.isBefore(applied)) eventDate = applied;

                // If INTERVIEW already inferred, don't duplicate it.
                boolean alreadyInterview = newHistory.stream().anyMatch(e -> e.getStatus() == ApplicationStatus.INTERVIEW);
                if (current == ApplicationStatus.INTERVIEW) {
                    if (!alreadyInterview) {
                        newHistory.add(ApplicationStatusEvent.builder()
                                .status(ApplicationStatus.INTERVIEW)
                                .date(eventDate)
                                .note("backfilled from current status")
                                .build());
                    }
                } else {
                    newHistory.add(ApplicationStatusEvent.builder()
                            .status(current)
                            .date(eventDate)
                            .note("backfilled from current status")
                            .build());
                }
            }

            // De-dupe by status keeping earliest date.
            Map<ApplicationStatus, ApplicationStatusEvent> earliest = new HashMap<>();
            for (ApplicationStatusEvent ev : newHistory) {
                if (ev == null || ev.getStatus() == null || ev.getDate() == null) continue;
                ApplicationStatusEvent prev = earliest.get(ev.getStatus());
                if (prev == null || ev.getDate().isBefore(prev.getDate())) {
                    earliest.put(ev.getStatus(), ev);
                }
            }
            List<ApplicationStatusEvent> deduped = new ArrayList<>(earliest.values());
            deduped.sort((a, b) -> {
                int c = a.getDate().compareTo(b.getDate());
                if (c != 0) return c;
                return a.getStatus().name().compareTo(b.getStatus().name());
            });

            app.setStatusHistory(deduped);

            if (app.getSource() == null) {
                app.setSource(ApplicationSource.UNKNOWN);
            }

            repository.save(app);
            updated++;
        }

        return BackfillStatusHistoryResponse.builder()
                .scanned(scanned)
                .updated(updated)
                .build();
    }

    private enum TrendType {
        APPLIED,
        INTERVIEW,
        OFFER
    }

    private LocalDate parseDateOrNull(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private List<Application> loadAppsForUser(String userId, LocalDate from, LocalDate to) {
        Query query = new Query();
        query.addCriteria(Criteria.where("userId").is(userId));

        if (from != null || to != null) {
            Criteria dateCriteria = Criteria.where("appliedDate");
            if (from != null) dateCriteria = dateCriteria.gte(from);
            if (to != null) dateCriteria = dateCriteria.lte(to);
            query.addCriteria(dateCriteria);
        }

        return mongoTemplate.find(query, Application.class);
    }

    private AnalyticsOverviewResponse buildOverview(List<Application> apps) {
        Map<String, Long> currentStatusCounts = new HashMap<>();
        Map<String, Long> reachedStageCounts = new HashMap<>();

        long total = apps.size();
        long reachedInterview = 0;
        long reachedOffer = 0;

        for (Application app : apps) {
            ApplicationStatus current = app.getStatus();
            if (current != null) {
                currentStatusCounts.merge(current.name(), 1L, Long::sum);
            }

            List<ApplicationStatusEvent> history = app.getStatusHistory();
            if (history != null) {
                // Count "reached" per app per stage (de-dupe within app)
                java.util.HashSet<String> stages = new java.util.HashSet<>();
                for (ApplicationStatusEvent ev : history) {
                    if (ev == null || ev.getStatus() == null) continue;
                    stages.add(ev.getStatus().name());
                }
                for (String stage : stages) {
                    reachedStageCounts.merge(stage, 1L, Long::sum);
                }

                if (stages.contains(ApplicationStatus.INTERVIEW.name())) reachedInterview++;
                if (stages.contains(ApplicationStatus.OFFER.name())) reachedOffer++;
            } else {
                // Backward compatibility: infer from current status
                if (current == ApplicationStatus.INTERVIEW || current == ApplicationStatus.OFFER) reachedInterview++;
                if (current == ApplicationStatus.OFFER) reachedOffer++;
            }
        }

        double interviewRate = total == 0 ? 0 : (double) reachedInterview / total * 100;
        double offerRate = total == 0 ? 0 : (double) reachedOffer / total * 100;

        Double medianDaysToInterview = medianDaysToStage(apps, ApplicationStatus.INTERVIEW);
        Double medianDaysToOffer = medianDaysToStage(apps, ApplicationStatus.OFFER);

        return AnalyticsOverviewResponse.builder()
                .totalApplications(total)
                .currentStatusCounts(currentStatusCounts)
                .reachedStageCounts(reachedStageCounts)
                .interviewRate(interviewRate)
                .offerRate(offerRate)
                .medianDaysToInterview(medianDaysToInterview)
                .medianDaysToOffer(medianDaysToOffer)
                .build();
    }

    private Double medianDaysToStage(List<Application> apps, ApplicationStatus stage) {
        List<Long> days = new ArrayList<>();
        for (Application app : apps) {
            Long d = daysFromAppliedToStage(app, stage);
            if (d != null && d >= 0) days.add(d);
        }
        if (days.isEmpty()) return null;
        days.sort(Long::compareTo);
        int mid = days.size() / 2;
        if (days.size() % 2 == 1) return (double) days.get(mid);
        return (days.get(mid - 1) + days.get(mid)) / 2.0;
    }

    private Long daysFromAppliedToStage(Application app, ApplicationStatus stage) {
        LocalDate applied = app.getAppliedDate();
        if (applied == null) return null;

        LocalDate reached = firstReachedDate(app, stage);
        if (reached == null) return null;

        return ChronoUnit.DAYS.between(applied, reached);
    }

    private LocalDate firstReachedDate(Application app, ApplicationStatus stage) {
        List<ApplicationStatusEvent> history = app.getStatusHistory();
        LocalDate best = null;
        if (history != null) {
            for (ApplicationStatusEvent ev : history) {
                if (ev == null || ev.getStatus() != stage) continue;
                if (ev.getDate() == null) continue;
                if (best == null || ev.getDate().isBefore(best)) best = ev.getDate();
            }
        }

        // Fallback: infer reached for older docs from current status
        if (best == null) {
            if (app.getStatus() == stage) {
                return app.getLastUpdated() != null ? app.getLastUpdated() : null;
            }
            if (stage == ApplicationStatus.INTERVIEW && app.getStatus() == ApplicationStatus.OFFER) {
                return app.getLastUpdated() != null ? app.getLastUpdated() : null;
            }
        }

        return best;
    }

    private List<TrendPointResponse> buildTrend(
            List<Application> apps,
            String groupBy,
            LocalDate from,
            LocalDate to,
            TrendType type
    ) {
        java.util.Map<String, Long> counts = new java.util.HashMap<>();

        for (Application app : apps) {
            LocalDate date;
            if (type == TrendType.APPLIED) {
                date = app.getAppliedDate();
            } else if (type == TrendType.INTERVIEW) {
                date = firstReachedDate(app, ApplicationStatus.INTERVIEW);
            } else {
                date = firstReachedDate(app, ApplicationStatus.OFFER);
            }

            if (date == null) continue;
            if (from != null && date.isBefore(from)) continue;
            if (to != null && date.isAfter(to)) continue;

            String key = formatPeriod(date, groupBy);
            counts.merge(key, 1L, Long::sum);
        }

        return counts.entrySet().stream()
                .sorted(java.util.Map.Entry.comparingByKey())
                .map(e -> TrendPointResponse.builder()
                        .period(e.getKey())
                        .count(e.getValue())
                        .build())
                .toList();
    }

    private String formatPeriod(LocalDate date, String groupBy) {
        if ("day".equals(groupBy)) {
            return date.toString();
        }
        // month default
        return String.format("%04d-%02d", date.getYear(), date.getMonthValue());
    }

    private List<AgingBucketResponse> buildAging(List<Application> apps) {
        long b0_7 = 0;
        long b8_14 = 0;
        long b15_30 = 0;
        long b31p = 0;

        LocalDate today = LocalDate.now();
        for (Application app : apps) {
            if (app.getAppliedDate() == null) continue;

            // "Open" means not OFFER and not REJECTED
            if (app.getStatus() == ApplicationStatus.OFFER
                    || app.getStatus() == ApplicationStatus.REJECTED) {
                continue;
            }

            long days = ChronoUnit.DAYS.between(app.getAppliedDate(), today);
            if (days <= 7) b0_7++;
            else if (days <= 14) b8_14++;
            else if (days <= 30) b15_30++;
            else b31p++;
        }

        List<AgingBucketResponse> out = new ArrayList<>();
        out.add(AgingBucketResponse.builder().bucket("0-7").count(b0_7).build());
        out.add(AgingBucketResponse.builder().bucket("8-14").count(b8_14).build());
        out.add(AgingBucketResponse.builder().bucket("15-30").count(b15_30).build());
        out.add(AgingBucketResponse.builder().bucket("31+").count(b31p).build());
        return out;
    }

    private List<SourceBreakdownResponse> buildSources(List<Application> apps) {
        Map<String, Long> map = new HashMap<>();
        for (Application app : apps) {
            String src = app.getSource() == null ? ApplicationSource.UNKNOWN.name() : app.getSource().name();
            map.merge(src, 1L, Long::sum);
        }
        return map.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .map(e -> SourceBreakdownResponse.builder()
                        .source(e.getKey())
                        .count(e.getValue())
                        .build())
                .toList();
    }

    private List<TopCompanyResponse> buildTopCompanies(List<Application> apps, int topN) {
        Map<String, Long> map = new HashMap<>();
        for (Application app : apps) {
            if (app.getCompany() == null || app.getCompany().isBlank()) continue;
            map.merge(app.getCompany().trim(), 1L, Long::sum);
        }
        return map.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(topN)
                .map(e -> TopCompanyResponse.builder()
                        .company(e.getKey())
                        .count(e.getValue())
                        .build())
                .toList();
    }

    private List<TopSkillResponse> buildTopSkills(List<Application> apps, int topN) {
        Map<String, Long> map = new HashMap<>();
        for (Application app : apps) {
            List<String> skills = app.getExtractedSkills();
            if (skills == null) continue;
            for (String s : skills) {
                if (s == null || s.isBlank()) continue;
                map.merge(s.trim(), 1L, Long::sum);
            }
        }
        return map.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(topN)
                .map(e -> TopSkillResponse.builder()
                        .skill(e.getKey())
                        .count(e.getValue())
                        .build())
                .toList();
    }

    private List<StageDurationBucketResponse> buildTimeToStageBuckets(
            List<Application> apps,
            ApplicationStatus stage
    ) {
        long b0_3 = 0;
        long b4_7 = 0;
        long b8_14 = 0;
        long b15p = 0;

        for (Application app : apps) {
            Long d = daysFromAppliedToStage(app, stage);
            if (d == null || d < 0) continue;
            if (d <= 3) b0_3++;
            else if (d <= 7) b4_7++;
            else if (d <= 14) b8_14++;
            else b15p++;
        }

        List<StageDurationBucketResponse> out = new ArrayList<>();
        out.add(StageDurationBucketResponse.builder().bucket("0-3").count(b0_3).build());
        out.add(StageDurationBucketResponse.builder().bucket("4-7").count(b4_7).build());
        out.add(StageDurationBucketResponse.builder().bucket("8-14").count(b8_14).build());
        out.add(StageDurationBucketResponse.builder().bucket("15+").count(b15p).build());
        return out;
    }

    @Override
    public PageResponse<ApplicationResponse> searchApplications(
            String email,
            String company,
            String role,
            String status,
            int page,
            int size,
            String sortBy,
            String direction) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Sort sort = direction.equalsIgnoreCase("desc")
                ? Sort.by(sortBy).descending()
                : Sort.by(sortBy).ascending();

        Pageable pageable = PageRequest.of(page, size, sort);

        List<Criteria> criteriaList = new ArrayList<>();

        // Always restrict to logged-in user
        criteriaList.add(Criteria.where("userId").is(user.getId()));

        if (company != null && !company.isBlank()) {
            criteriaList.add(Criteria.where("company").regex(company, "i"));
        }

        if (role != null && !role.isBlank()) {
            criteriaList.add(Criteria.where("role").regex(role, "i"));
        }

        if (status != null && !status.isBlank()) {
            criteriaList.add(Criteria.where("status")
                    .is(ApplicationStatus.valueOf(status.toUpperCase())));
        }

        Criteria finalCriteria = new Criteria().andOperator(
                criteriaList.toArray(new Criteria[0])
        );

        Query query = new Query(finalCriteria).with(pageable);

        List<Application> applications =
                mongoTemplate.find(query, Application.class);

        long total = mongoTemplate.count(
                Query.of(query).limit(-1).skip(-1),
                Application.class
        );

        List<ApplicationResponse> content = applications.stream()
                .map(this::mapToResponse)
                .toList();

        return PageResponse.<ApplicationResponse>builder()
                .content(content)
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages((int) Math.ceil((double) total / size))
                .last(page >= ((int) Math.ceil((double) total / size) - 1))
                .build();
    }



    private ApplicationResponse mapToResponse(Application application) {

        return ApplicationResponse.builder()
                .id(application.getId())
                .company(application.getCompany())
                .role(application.getRole())
                .jobDescription(application.getJobDescription())
                .extractedSkills(application.getExtractedSkills())
                .source(application.getSource() != null ? application.getSource().name() : null)
                .jobUrl(application.getJobUrl())
                .location(application.getLocation())
                .salaryMin(application.getSalaryMin())
                .salaryMax(application.getSalaryMax())
                .currency(application.getCurrency())
                .status(application.getStatus())
                .appliedDate(application.getAppliedDate())
                .lastUpdated(application.getLastUpdated())
                .interviews(application.getInterviews())
                .build();
    }

    private void addStatusEvent(Application application,
                               ApplicationStatus status,
                               LocalDate date,
                               String note) {
        List<ApplicationStatusEvent> history = application.getStatusHistory();
        if (history == null) {
            history = new ArrayList<>();
            application.setStatusHistory(history);
        }

        history.add(ApplicationStatusEvent.builder()
                .status(status)
                .date(date)
                .note(note)
                .build());
    }

    private ApplicationSource parseSource(String source) {
        if (source == null || source.isBlank()) return ApplicationSource.UNKNOWN;
        try {
            return ApplicationSource.valueOf(source.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ApplicationSource.OTHER;
        }
    }
}
