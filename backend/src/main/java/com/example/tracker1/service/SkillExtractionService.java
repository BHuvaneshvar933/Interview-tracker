package com.example.tracker1.service;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SkillExtractionService {

    private static final Set<String> SKILL_DICTIONARY = Set.of(
            "java", "spring boot", "mongodb", "react",
            "node.js", "docker", "kubernetes",
            "rest api", "microservices", "aws",
            "sql", "python", "javascript"
    );

    public List<String> extractSkills(String jobDescription) {

        if (jobDescription == null || jobDescription.isBlank()) {
            return Collections.emptyList();
        }

        String lowerCaseJD = jobDescription.toLowerCase();

        return SKILL_DICTIONARY.stream()
                .filter(lowerCaseJD::contains)
                .map(String::toUpperCase)
                .collect(Collectors.toList());
    }
}