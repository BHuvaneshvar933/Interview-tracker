package com.example.tracker1.repository;

import com.example.tracker1.model.entity.Reminder;
import com.example.tracker1.model.entity.ReminderStatus;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface ReminderRepository extends MongoRepository<Reminder, String> {
    List<Reminder> findByUserIdOrderByRemindAtAsc(String userId);

    List<Reminder> findByStatusAndRemindAtLessThanEqual(ReminderStatus status, Instant now);
}
