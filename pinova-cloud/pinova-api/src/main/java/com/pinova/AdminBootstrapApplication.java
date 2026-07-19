package com.pinova;

import com.pinova.service.AdminBootstrapService;
import com.pinova.service.command.BootstrapAdminCommand;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;

public final class AdminBootstrapApplication {
    private AdminBootstrapApplication() {
    }

    public static void main(String[] args) {
        SpringApplication application = new SpringApplication(PinovaApplication.class);
        application.setWebApplicationType(WebApplicationType.NONE);
        try (ConfigurableApplicationContext context = application.run(args)) {
            Environment environment = context.getEnvironment();
            String username = environment.getProperty("PINOVA_ADMIN_BOOTSTRAP_USERNAME");
            String password = environment.getProperty("PINOVA_ADMIN_BOOTSTRAP_PASSWORD");
            String createdUsername = context.getBean(AdminBootstrapService.class)
                    .bootstrap(new BootstrapAdminCommand(username, password));
            System.out.println("Created temporary Pinova administrator: " + createdUsername);
        }
    }
}

