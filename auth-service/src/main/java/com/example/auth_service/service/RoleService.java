package com.example.auth_service.service;

import com.example.auth_service.entity.Role;

import java.util.List;
import java.util.UUID;

public interface RoleService {

    Role create(Role role);

    Role findById(UUID id);

    Role findByName(String name);

    List<Role> findAll();

    void deleteById(UUID id);
}
