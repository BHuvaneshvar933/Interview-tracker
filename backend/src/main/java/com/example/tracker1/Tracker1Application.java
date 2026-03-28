package com.example.tracker1;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Tracker1Application {

	public static void main(String[] args) {
		SpringApplication.run(Tracker1Application.class, args);
	}

}
//Add an explicit “Offline library” screen listing all cached applications + “Clear offline data” button
//Add queued writes (create/update/interview) to sync later when online
//Code-split charts to reduce the large bundle warning (recharts)