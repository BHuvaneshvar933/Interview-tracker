package com.example.tracker1.repository;

import com.example.tracker1.model.entity.PushSubscription;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends MongoRepository<PushSubscription, String> {
    List<PushSubscription> findByUserId(String userId);
    Optional<PushSubscription> findByUserIdAndEndpoint(String userId, String endpoint);
    void deleteByUserIdAndEndpoint(String userId, String endpoint);
}
