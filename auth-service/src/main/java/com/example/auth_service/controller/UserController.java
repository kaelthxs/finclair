package com.example.auth_service.controller;

import com.example.auth_service.dto.response.UserSummaryResponse;
import com.example.auth_service.entity.User;
import com.example.auth_service.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Stream;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<List<UserSummaryResponse>> list(@RequestParam(required = false) String role) {
        Stream<User> users = userService.findAll().stream();

        if (role != null && !role.isBlank()) {
            String roleFilter = role.trim().toUpperCase(Locale.ROOT);
            users = users.filter(user ->
                    user.getRole() != null &&
                    user.getRole().getName() != null &&
                    user.getRole().getName().trim().toUpperCase(Locale.ROOT).equals(roleFilter));
        }

        List<UserSummaryResponse> response = users
                .sorted(Comparator.comparing(User::getCreatedAt).reversed())
                .map(user -> new UserSummaryResponse(
                        user.getId(),
                        user.getLogin(),
                        user.getEmail(),
                        user.getFirstName(),
                        user.getLastName(),
                        user.getRole() != null ? user.getRole().getName() : null
                ))
                .toList();

        return ResponseEntity.ok(response);
    }
}
