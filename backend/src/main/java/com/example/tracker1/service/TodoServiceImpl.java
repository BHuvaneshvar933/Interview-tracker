package com.example.tracker1.service;

import com.example.tracker1.exception.BadRequestException;
import com.example.tracker1.exception.ResourceNotFoundException;
import com.example.tracker1.model.dto.TodoCreateRequest;
import com.example.tracker1.model.dto.TodoResponse;
import com.example.tracker1.model.dto.TodoUpdateRequest;
import com.example.tracker1.model.entity.Todo;
import com.example.tracker1.model.entity.TodoPriority;
import com.example.tracker1.model.entity.User;
import com.example.tracker1.repository.TodoRepository;
import com.example.tracker1.repository.UserRepository;
import com.example.tracker1.repository.ReminderRepository;
import com.example.tracker1.util.SecurityUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TodoServiceImpl implements TodoService {

    private final TodoRepository todoRepository;
    private final UserRepository userRepository;
    private final ReminderRepository reminderRepository;

    private User getCurrentUser() {
        String email = SecurityUtil.getCurrentUserEmail();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Override
    public List<TodoResponse> list(String status, String category, String q) {
        User user = getCurrentUser();

        List<Todo> all = todoRepository.findByUserIdOrderByCompletedAscDueDateAscCreatedAtDesc(user.getId());

        return all.stream()
                .filter(t -> {
                    if (status == null || status.isBlank()) return true;
                    return switch (status.trim().toLowerCase()) {
                        case "active" -> !t.isCompleted();
                        case "completed" -> t.isCompleted();
                        case "all" -> true;
                        default -> true;
                    };
                })
                .filter(t -> category == null || category.isBlank() || (t.getCategory() != null && t.getCategory().equalsIgnoreCase(category.trim())))
                .filter(t -> {
                    if (q == null || q.isBlank()) return true;
                    String qq = q.trim().toLowerCase();
                    String title = t.getTitle() != null ? t.getTitle().toLowerCase() : "";
                    String desc = t.getDescription() != null ? t.getDescription().toLowerCase() : "";
                    return title.contains(qq) || desc.contains(qq);
                })
                .map(this::toResponse)
                .toList();
    }

    @Override
    public TodoResponse create(TodoCreateRequest request) {
        User user = getCurrentUser();

        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new BadRequestException("title is required");
        }

        Instant now = Instant.now();
        Todo todo = Todo.builder()
                .userId(user.getId())
                .title(request.getTitle().trim())
                .description(trimToNull(request.getDescription()))
                .category(trimToNull(request.getCategory()))
                .priority(parsePriority(request.getPriority()))
                .dueDate(request.getDueDate())
                .completed(false)
                .createdAt(now)
                .updatedAt(now)
                .build();

        Todo saved = todoRepository.save(todo);
        return toResponse(saved);
    }

    @Override
    public TodoResponse update(String id, TodoUpdateRequest request) {
        User user = getCurrentUser();
        Todo todo = todoRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Todo not found"));

        boolean changed = false;
        if (request.getTitle() != null) {
            String t = request.getTitle().trim();
            if (t.isBlank()) throw new BadRequestException("title cannot be blank");
            todo.setTitle(t);
            changed = true;
        }
        if (request.getDescription() != null) {
            todo.setDescription(trimToNull(request.getDescription()));
            changed = true;
        }
        if (request.getCategory() != null) {
            todo.setCategory(trimToNull(request.getCategory()));
            changed = true;
        }
        if (request.getPriority() != null) {
            todo.setPriority(parsePriority(request.getPriority()));
            changed = true;
        }
        if (Boolean.TRUE.equals(request.getClearDueDate())) {
            todo.setDueDate(null);
            changed = true;
        } else if (request.getDueDate() != null) {
            todo.setDueDate(request.getDueDate());
            changed = true;
        }
        if (request.getCompleted() != null) {
            boolean next = request.getCompleted();
            if (next != todo.isCompleted()) {
                todo.setCompleted(next);
                todo.setCompletedAt(next ? Instant.now() : null);
                changed = true;
            }
        }

        if (changed) {
            todo.setUpdatedAt(Instant.now());
            todo = todoRepository.save(todo);
        }

        return toResponse(todo);
    }

    @Override
    public void delete(String id) {
        User user = getCurrentUser();
        Todo todo = todoRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Todo not found"));

        // Cleanup reminders attached to this todo.
        reminderRepository.deleteByUserIdAndTodoId(user.getId(), id);
        todoRepository.delete(todo);
    }

    private TodoResponse toResponse(Todo t) {
        return TodoResponse.builder()
                .id(t.getId())
                .title(t.getTitle())
                .description(t.getDescription())
                .category(t.getCategory())
                .priority(t.getPriority() != null ? t.getPriority().name() : null)
                .dueDate(t.getDueDate())
                .completed(t.isCompleted())
                .completedAt(t.getCompletedAt())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }

    private static TodoPriority parsePriority(String raw) {
        if (raw == null || raw.isBlank()) return TodoPriority.MEDIUM;
        try {
            return TodoPriority.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("priority must be LOW, MEDIUM, or HIGH");
        }
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isBlank() ? null : t;
    }
}
