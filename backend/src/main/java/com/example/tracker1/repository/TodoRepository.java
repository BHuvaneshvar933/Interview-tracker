package com.example.tracker1.repository;

import com.example.tracker1.model.entity.Todo;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface TodoRepository extends MongoRepository<Todo, String> {
    List<Todo> findByUserIdOrderByCompletedAscDueDateAscCreatedAtDesc(String userId);
    Optional<Todo> findByIdAndUserId(String id, String userId);
}
