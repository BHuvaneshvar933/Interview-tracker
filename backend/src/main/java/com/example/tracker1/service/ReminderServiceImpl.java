package com.example.tracker1.service;

import com.example.tracker1.exception.ResourceNotFoundException;
import com.example.tracker1.exception.BadRequestException;
import com.example.tracker1.model.dto.ReminderRequest;
import com.example.tracker1.model.dto.ReminderResponse;
import com.example.tracker1.model.entity.Application;
import com.example.tracker1.model.entity.Reminder;
import com.example.tracker1.model.entity.ReminderStatus;
import com.example.tracker1.model.entity.User;
import com.example.tracker1.repository.ApplicationRepository;
import com.example.tracker1.repository.ReminderRepository;
import com.example.tracker1.repository.TodoRepository;
import com.example.tracker1.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReminderServiceImpl implements ReminderService {

    private final ReminderRepository reminderRepository;
    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final TodoRepository todoRepository;

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

    @Override
    public ReminderResponse create(ReminderRequest request) {
        User user = getCurrentUser();
        if (request.getRemindAt() == null) {
            throw new BadRequestException("remindAt is required");
        }
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new BadRequestException("title is required");
        }

        if (request.getApplicationId() != null && !request.getApplicationId().isBlank()) {
            Application app = applicationRepository.findById(request.getApplicationId())
                    .orElseThrow(() -> new ResourceNotFoundException("Application not found"));
            if (!user.getId().equals(app.getUserId())) {
                throw new AccessDeniedException("Unauthorized");
            }
        }

        if (request.getTodoId() != null && !request.getTodoId().isBlank()) {
            todoRepository.findByIdAndUserId(request.getTodoId(), user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Todo not found"));
        }

        Reminder reminder = Reminder.builder()
                .userId(user.getId())
                .applicationId(request.getApplicationId())
                .todoId(request.getTodoId())
                .interviewRoundName(request.getInterviewRoundName())
                .title(request.getTitle())
                .message(request.getMessage())
                .remindAt(request.getRemindAt())
                .status(ReminderStatus.PENDING)
                .channel("PUSH")
                .createdAt(Instant.now())
                .build();

        Reminder saved = reminderRepository.save(reminder);
        return toResponse(saved);
    }

    @Override
    public List<ReminderResponse> list() {
        User user = getCurrentUser();
        return reminderRepository.findByUserIdOrderByRemindAtAsc(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public void delete(String id) {
        User user = getCurrentUser();
        Reminder reminder = reminderRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reminder not found"));
        if (!reminder.getUserId().equals(user.getId())) {
            throw new AccessDeniedException("Unauthorized");
        }
        reminderRepository.delete(reminder);
    }

    private ReminderResponse toResponse(Reminder r) {
        return ReminderResponse.builder()
                .id(r.getId())
                .applicationId(r.getApplicationId())
                .todoId(r.getTodoId())
                .interviewRoundName(r.getInterviewRoundName())
                .title(r.getTitle())
                .message(r.getMessage())
                .remindAt(r.getRemindAt())
                .status(r.getStatus() != null ? r.getStatus().name() : null)
                .build();
    }
}
