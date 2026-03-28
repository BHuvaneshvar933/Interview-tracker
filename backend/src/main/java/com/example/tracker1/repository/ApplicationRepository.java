package com.example.tracker1.repository;

import com.example.tracker1.model.entity.Application;
import com.example.tracker1.model.entity.ApplicationStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;


import java.util.List;

public interface ApplicationRepository
        extends MongoRepository<Application, String>,
ApplicationCustomRepository{

    List<Application> findByUserId(String userId);

    List<Application> findByUserIdAndStatus(String userId, ApplicationStatus status);

    List<Application> findByUserIdOrderByAppliedDateDesc(String userId);

    Page<Application> findByUserId(String userId, Pageable pageable);

    Page<Application> findByUserIdAndStatus(
            String userId,
            ApplicationStatus status,
            Pageable pageable);


}