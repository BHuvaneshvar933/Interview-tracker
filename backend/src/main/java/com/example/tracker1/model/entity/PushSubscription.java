package com.example.tracker1.model.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "push_subscriptions")
@CompoundIndexes({
        @CompoundIndex(name = "user_endpoint_idx", def = "{'userId': 1, 'endpoint': 1}")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PushSubscription {

    @Id
    private String id;

    @Indexed
    private String userId;

    @Indexed
    private String endpoint;

    private String p256dh;

    private String auth;

    private String userAgent;

    private Instant createdAt;
}
