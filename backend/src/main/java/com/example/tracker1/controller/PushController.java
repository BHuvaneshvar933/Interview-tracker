package com.example.tracker1.controller;

import com.example.tracker1.exception.ResourceNotFoundException;
import com.example.tracker1.model.dto.PushSubscriptionRequest;
import com.example.tracker1.model.entity.PushSubscription;
import com.example.tracker1.model.entity.User;
import com.example.tracker1.repository.PushSubscriptionRepository;
import com.example.tracker1.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/push")
@RequiredArgsConstructor
public class PushController {

    private final PushSubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;

    @Value("${app.push.public-key:}")
    private String publicKey;

    private String getCurrentUserEmail() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetails userDetails) return userDetails.getUsername();
        return principal.toString();
    }

    private User getCurrentUser() {
        String email = getCurrentUserEmail();
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @GetMapping("/public-key")
    public ResponseEntity<String> getPublicKey() {
        return ResponseEntity.ok(publicKey == null ? "" : publicKey);
    }

    @PostMapping("/subscribe")
    public ResponseEntity<Void> subscribe(@RequestBody PushSubscriptionRequest request) {
        User user = getCurrentUser();
        if (request.getEndpoint() == null || request.getEndpoint().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (request.getKeys() == null
                || request.getKeys().getP256dh() == null
                || request.getKeys().getAuth() == null) {
            return ResponseEntity.badRequest().build();
        }

        subscriptionRepository.findByUserIdAndEndpoint(user.getId(), request.getEndpoint())
                .ifPresentOrElse(existing -> {
                    existing.setP256dh(request.getKeys().getP256dh());
                    existing.setAuth(request.getKeys().getAuth());
                    existing.setUserAgent(request.getUserAgent());
                    subscriptionRepository.save(existing);
                }, () -> {
                    PushSubscription sub = PushSubscription.builder()
                            .userId(user.getId())
                            .endpoint(request.getEndpoint())
                            .p256dh(request.getKeys().getP256dh())
                            .auth(request.getKeys().getAuth())
                            .userAgent(request.getUserAgent())
                            .createdAt(Instant.now())
                            .build();
                    subscriptionRepository.save(sub);
                });

        return ResponseEntity.ok().build();
    }

    @PostMapping("/unsubscribe")
    public ResponseEntity<Void> unsubscribe(@RequestBody PushSubscriptionRequest request) {
        User user = getCurrentUser();
        if (request.getEndpoint() == null || request.getEndpoint().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        subscriptionRepository.deleteByUserIdAndEndpoint(user.getId(), request.getEndpoint());
        return ResponseEntity.ok().build();
    }
}
