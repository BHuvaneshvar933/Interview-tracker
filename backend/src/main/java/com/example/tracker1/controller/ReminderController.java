package com.example.tracker1.controller;

import com.example.tracker1.model.dto.ReminderRequest;
import com.example.tracker1.model.dto.ReminderResponse;
import com.example.tracker1.service.ReminderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reminders")
@RequiredArgsConstructor
public class ReminderController {

    private final ReminderService reminderService;

    @GetMapping
    public ResponseEntity<List<ReminderResponse>> list() {
        return ResponseEntity.ok(reminderService.list());
    }

    @PostMapping
    public ResponseEntity<ReminderResponse> create(@RequestBody ReminderRequest request) {
        return ResponseEntity.ok(reminderService.create(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        reminderService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
