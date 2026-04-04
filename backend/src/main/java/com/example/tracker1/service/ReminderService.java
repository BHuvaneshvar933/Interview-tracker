package com.example.tracker1.service;

import com.example.tracker1.model.dto.ReminderRequest;
import com.example.tracker1.model.dto.ReminderResponse;

import java.util.List;

public interface ReminderService {
    ReminderResponse create(ReminderRequest request);
    List<ReminderResponse> list();
    void delete(String id);
}
