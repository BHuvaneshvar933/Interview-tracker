package com.example.tracker1.service;

import com.example.tracker1.model.entity.PushSubscription;
import lombok.RequiredArgsConstructor;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Utils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class PushServiceImpl implements com.example.tracker1.service.PushService {

    @Value("${app.push.public-key:}")
    private String publicKey;

    @Value("${app.push.private-key:}")
    private String privateKey;

    @Value("${app.push.subject:mailto:admin@example.com}")
    private String subject;

    @Override
    public boolean isConfigured() {
        return publicKey != null && !publicKey.isBlank()
                && privateKey != null && !privateKey.isBlank();
    }

    @Override
    public void send(PushSubscription sub, String title, String message, String url) {
        if (!isConfigured()) {
            throw new IllegalStateException("Push not configured");
        }

        try {
            PushService pushService = new PushService();
            pushService.setSubject(subject);
            pushService.setPublicKey(Utils.loadPublicKey(publicKey));
            pushService.setPrivateKey(Utils.loadPrivateKey(privateKey));

            String payload = "{" +
                    "\"title\":" + jsonString(title) + "," +
                    "\"message\":" + jsonString(message) + "," +
                    "\"url\":" + jsonString(url) +
                    "}";

            Notification notification = new Notification(
                    sub.getEndpoint(),
                    sub.getP256dh(),
                    sub.getAuth(),
                    payload.getBytes(StandardCharsets.UTF_8)
            );

            pushService.send(notification);
        } catch (Exception e) {
            throw new RuntimeException("Failed to send push", e);
        }
    }

    private static String jsonString(String s) {
        if (s == null) return "\"\"";
        String escaped = s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
        return "\"" + escaped + "\"";
    }
}
