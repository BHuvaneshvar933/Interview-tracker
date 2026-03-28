package com.example.tracker1.repository;

import com.example.tracker1.model.entity.InterviewQuestionSet;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface InterviewQuestionSetRepository extends MongoRepository<InterviewQuestionSet, String> {
    Optional<InterviewQuestionSet> findByIdAndUserEmail(String id, String userEmail);
}
