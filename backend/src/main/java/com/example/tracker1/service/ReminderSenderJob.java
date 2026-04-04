package com.example.tracker1.service;

import com.example.tracker1.model.entity.PushSubscription;
import com.example.tracker1.model.entity.Reminder;
import com.example.tracker1.model.entity.ReminderStatus;
import com.example.tracker1.repository.PushSubscriptionRepository;
import com.example.tracker1.repository.ReminderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
@EnableScheduling
@RequiredArgsConstructor
public class ReminderSenderJob {

    private final ReminderRepository reminderRepository;
    private final PushSubscriptionRepository subscriptionRepository;
    private final PushService pushService;

    @Scheduled(fixedDelayString = "${REMINDER_SENDER_DELAY_MS:60000}")
    public void sendDue() {
        if (!pushService.isConfigured()) {
            return;
        }

        Instant now = Instant.now();
        List<Reminder> due = reminderRepository.findByStatusAndRemindAtLessThanEqual(ReminderStatus.PENDING, now);
        if (due.isEmpty()) return;

        for (Reminder r : due) {
            try {
                List<PushSubscription> subs = subscriptionRepository.findByUserId(r.getUserId());
                if (subs.isEmpty()) {
                    r.setStatus(ReminderStatus.FAILED);
                    reminderRepository.save(r);
                    continue;
                }

                String url = r.getApplicationId() != null && !r.getApplicationId().isBlank()
                        ? "/applications/" + r.getApplicationId()
                        : "/dashboard";

                String title = r.getTitle() != null ? r.getTitle() : "Reminder";
                String msg = r.getMessage() != null && !r.getMessage().isBlank() ? r.getMessage() : "Don't forget to follow up.";

                for (PushSubscription sub : subs) {
                    pushService.send(sub, title, msg, url);
                }

                r.setStatus(ReminderStatus.SENT);
                r.setSentAt(Instant.now());
                reminderRepository.save(r);
            } catch (Exception e) {
                r.setStatus(ReminderStatus.FAILED);
                reminderRepository.save(r);
            }
        }
    }
}
