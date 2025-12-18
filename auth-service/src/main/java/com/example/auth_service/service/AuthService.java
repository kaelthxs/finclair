package com.example.auth_service.service;

import com.example.auth_service.dto.request.LoginRequest;
import com.example.auth_service.dto.request.RefreshRequest;
import com.example.auth_service.dto.request.RegisterRequest;
import com.example.auth_service.dto.response.TokenResponse;

public interface AuthService {
    void register(RegisterRequest request);
    TokenResponse login(LoginRequest loginRequest);
    TokenResponse refresh(String refreshToken);
    void logout(String refreshToken);
}
