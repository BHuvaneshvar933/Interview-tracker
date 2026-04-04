package com.example.tracker1.service;

import com.example.tracker1.model.entity.PushSubscription;

public interface PushService {
    boolean isConfigured();
    void send(PushSubscription sub, String title, String message, String url);
}
