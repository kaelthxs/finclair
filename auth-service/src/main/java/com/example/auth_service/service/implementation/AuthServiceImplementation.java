package com.example.auth_service.service.implementation;

import com.example.auth_service.dto.request.LoginRequest;
import com.example.auth_service.dto.request.RegisterRequest;
import com.example.auth_service.dto.response.TokenResponse;
import com.example.auth_service.entity.Role;
import com.example.auth_service.entity.User;
import com.example.auth_service.repository.RoleRepository;
import com.example.auth_service.repository.UserRepository;
import com.example.auth_service.security.service.JwtService;
import com.example.auth_service.security.service.RefreshTokenService;
import com.example.auth_service.service.AuthService;
import io.jsonwebtoken.Claims;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthServiceImplementation implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    public AuthServiceImplementation(UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder,
                                     JwtService jwtService,
                                     RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.refreshTokenService = refreshTokenService;
    }

    public TokenResponse login(LoginRequest request) {

        User user = userRepository
                .findByEmailOrLogin(request.getIdentifier(), request.getIdentifier())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        refreshTokenService.saveRefreshToken(user.getId(), refreshToken);

        return new TokenResponse(accessToken, refreshToken);
    }

    @Override
    public TokenResponse refresh(String refreshToken) {

        Claims claims;
        try {
            claims = jwtService.parseToken(refreshToken);
        } catch (Exception e) {
            throw new RuntimeException("Invalid refresh token");
        }

        String type = claims.get("type", String.class);
        if (!"refresh".equals(type)) {
            throw new RuntimeException("Invalid token type");
        }

        String userIdStr = claims.getSubject();
        if (userIdStr == null) {
            throw new RuntimeException("Invalid refresh token: subject missing");
        }

        UUID userId = UUID.fromString(userIdStr);
        String storedToken = refreshTokenService.getRefreshToken(userId);

        if (storedToken == null || !storedToken.equals(refreshToken)) {
            throw new RuntimeException("Refresh token expired or invalidated");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newAccess = jwtService.generateAccessToken(user);
        String newRefresh = jwtService.generateRefreshToken(user);

        refreshTokenService.saveRefreshToken(userId, newRefresh);

        return new TokenResponse(newAccess, newRefresh);
    }


    @Override
    public void logout(String refreshToken) {

        Claims claims;
        try {
            claims = jwtService.parseToken(refreshToken);
        } catch (Exception e) {
            return;
        }

        String type = claims.get("type", String.class);
        if (!"refresh".equals(type)) {
            return;
        }

        String userIdStr = claims.getSubject();
        if (userIdStr == null) {
            return;
        }

        UUID userId = UUID.fromString(userIdStr);

        refreshTokenService.deleteRefreshToken(userId);
    }



    public void register(RegisterRequest request) {

        if (userRepository.existsByLogin(request.getLogin())) {
            throw new RuntimeException("Login already in use");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }

        Role userRole = roleRepository.findByName("USER")
                .orElseThrow(() -> new RuntimeException("Role USER not found"));

        User user = new User(
                request.getLogin(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                request.getFirstName(),
                request.getLastName(),
                null,
                false,
                LocalDateTime.now(),
                null,
                request.getPreferredLanguage(),
                userRole
        );

        userRepository.save(user);
    }
}
