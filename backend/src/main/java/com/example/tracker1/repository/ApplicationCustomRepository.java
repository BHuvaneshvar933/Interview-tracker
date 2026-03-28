package com.example.tracker1.repository;

import com.example.tracker1.model.dto.*;
import com.example.tracker1.model.entity.Application;

public interface ApplicationCustomRepository {

    PageResponse<Application> searchApplications(
            ApplicationSearchRequest request,
            String userId
    );
}
