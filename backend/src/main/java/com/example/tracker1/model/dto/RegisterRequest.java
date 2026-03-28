package com.example.tracker1.model.dto;

import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
}
