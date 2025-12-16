package com.example.auth_service.dto.request;

public class LoginRequest {

    private String identifier; // login ИЛИ email
    private String password;

    public LoginRequest() {}

    public String getIdentifier() {
        return identifier;
    }

    public void setIdentifier(String identifier) {
        this.identifier = identifier;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
