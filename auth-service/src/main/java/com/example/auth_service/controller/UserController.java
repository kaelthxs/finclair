package com.example.auth_service.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class UserController {
    @GetMapping("/hello")
    public String sayHello() {
        return "hello";
    }
}
