package com.example.auth_service.dto.response;

import java.util.UUID;

public class UserSummaryResponse {

    private UUID id;
    private String login;
    private String email;
    private String firstName;
    private String lastName;
    private String roleName;

    public UserSummaryResponse(UUID id, String login, String email, String firstName, String lastName, String roleName) {
        this.id = id;
        this.login = login;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.roleName = roleName;
    }

    public UUID getId() {
        return id;
    }

    public String getLogin() {
        return login;
    }

    public String getEmail() {
        return email;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public String getRoleName() {
        return roleName;
    }
}
