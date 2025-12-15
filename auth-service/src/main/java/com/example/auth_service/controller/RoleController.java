package com.example.auth_service.controller;

import com.example.auth_service.dto.request.RoleCreateRequest;
import com.example.auth_service.dto.response.RoleResponse;
import com.example.auth_service.entity.Role;
import com.example.auth_service.service.RoleService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/roles")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    @PostMapping
    public ResponseEntity<RoleResponse> create(@Valid @RequestBody RoleCreateRequest req) {
        Role role = roleService.create(new Role(req.getName()));
        return ResponseEntity.ok(new RoleResponse(role.getId(), role.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoleResponse> get(@PathVariable UUID id) {
        Role role = roleService.findById(id);
        return ResponseEntity.ok(new RoleResponse(role.getId(), role.getName()));
    }

    @GetMapping
    public ResponseEntity<List<RoleResponse>> list() {
        return ResponseEntity.ok(
                roleService.findAll().stream()
                        .map(r -> new RoleResponse(r.getId(), r.getName()))
                        .toList()
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        roleService.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
