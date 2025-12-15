package com.example.auth_service.dto.response;

import java.util.UUID;

public class RoleResponse {
    private UUID id;
    private String name;

    public RoleResponse(UUID id, String name) {
        this.id = id;
        this.name = name;
    }

    public UUID getId() { return id; }
    public String getName() { return name; }
}
