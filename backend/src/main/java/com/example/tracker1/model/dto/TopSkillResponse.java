package com.example.tracker1.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TopSkillResponse {

    private String skill;
    private long count;
}
