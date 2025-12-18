package com.example.auth_service.security.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class RefreshTokenService {

    private final RedisTemplate<String, String> redisTemplate;

    private final long refreshTtlSeconds;

    public RefreshTokenService(
            @Value("${jwt.refresh-ttl-days}") long REFRESH_TTL_DAYS,
            RedisTemplate<String, String> redisTemplate
    ) {
        this.refreshTtlSeconds = Duration.ofDays(REFRESH_TTL_DAYS).getSeconds();
        this.redisTemplate = redisTemplate;
    }

    public void saveRefreshToken(UUID userId, String token) {
        String key = "refresh:" + userId;
        redisTemplate.opsForValue().set(key, token, refreshTtlSeconds, TimeUnit.SECONDS);
    }

    public String getRefreshToken(UUID userId) {
        String key = "refresh:" + userId;
        return redisTemplate.opsForValue().get(key);
    }

    public void deleteRefreshToken(UUID userId) {
        String key = "refresh:" + userId;
        redisTemplate.delete(key);
    }
}
