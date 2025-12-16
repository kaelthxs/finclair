package com.example.auth_service.service;

import com.example.auth_service.dto.request.LoginRequest;
import com.example.auth_service.dto.request.RegisterRequest;
import com.example.auth_service.entity.Role;

public interface AuthService {
    void register(RegisterRequest request);
    String login(LoginRequest loginRequest);
}
