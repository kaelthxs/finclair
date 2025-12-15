package com.example.auth_service.service;

import com.example.auth_service.entity.User;

import java.util.List;
import java.util.UUID;

public interface UserService {

    User create(User user);

    User findById(UUID id);

    User findByEmail(String email);

    User findByLogin(String login);

    List<User> findAll();

    void deleteById(UUID id);
}
