package com.example.tracker1.service;

import com.example.tracker1.model.dto.*;

public interface AuthService {

    void register(RegisterRequest request);

    AuthResponse login(AuthRequest request);
}
