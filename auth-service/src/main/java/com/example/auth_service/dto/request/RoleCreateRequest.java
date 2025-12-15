package com.example.auth_service.dto.request;

import jakarta.validation.constraints.NotBlank;

public class RoleCreateRequest {
    @NotBlank
    private String name;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
