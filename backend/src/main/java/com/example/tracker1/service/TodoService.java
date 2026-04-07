package com.example.tracker1.service;

import com.example.tracker1.model.dto.TodoCreateRequest;
import com.example.tracker1.model.dto.TodoResponse;
import com.example.tracker1.model.dto.TodoUpdateRequest;

import java.util.List;

public interface TodoService {
    List<TodoResponse> list(String status, String category, String q);
    TodoResponse create(TodoCreateRequest request);
    TodoResponse update(String id, TodoUpdateRequest request);
    void delete(String id);
}
