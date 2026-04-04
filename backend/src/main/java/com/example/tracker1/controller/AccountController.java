package com.example.tracker1.controller;

import com.example.tracker1.exception.ResourceNotFoundException;
import com.example.tracker1.model.entity.User;
import com.example.tracker1.repository.UserRepository;
import com.example.tracker1.util.SecurityUtil;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountController {

    private final UserRepository userRepository;

    @GetMapping("/me")
    public ResponseEntity<MeResponse> me() {
        String email = SecurityUtil.getCurrentUserEmail();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return ResponseEntity.ok(new MeResponse(user.getId(), user.getEmail(), user.getRole()));
    }

    @Data
    public static class MeResponse {
        private final String id;
        private final String email;
        private final String role;
    }
}
