package com.pinova;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

@MapperScan("com.pinova.mapper")
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class PinovaApplication {

    public static void main(String[] args) {
        SpringApplication.run(PinovaApplication.class, args);
    }
}
