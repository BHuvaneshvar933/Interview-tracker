package com.example.tracker1.repository;

import com.example.tracker1.model.entity.ResumeDocument;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ResumeRepository extends MongoRepository<ResumeDocument, String> {
    Optional<ResumeDocument> findByIdAndUserEmail(String id, String userEmail);

    List<ResumeDocument> findAllByUserEmailOrderByCreatedAtDesc(String userEmail);
}
