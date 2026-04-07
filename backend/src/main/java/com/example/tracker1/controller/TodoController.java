package com.example.tracker1.controller;

import com.example.tracker1.model.dto.TodoCreateRequest;
import com.example.tracker1.model.dto.TodoResponse;
import com.example.tracker1.model.dto.TodoUpdateRequest;
import com.example.tracker1.service.TodoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/todos")
@RequiredArgsConstructor
public class TodoController {

    private final TodoService todoService;

    @GetMapping
    public ResponseEntity<List<TodoResponse>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false, name = "q") String query
    ) {
        return ResponseEntity.ok(todoService.list(status, category, query));
    }

    @PostMapping
    public ResponseEntity<TodoResponse> create(@RequestBody TodoCreateRequest request) {
        return ResponseEntity.ok(todoService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TodoResponse> update(@PathVariable String id, @RequestBody TodoUpdateRequest request) {
        return ResponseEntity.ok(todoService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        todoService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
