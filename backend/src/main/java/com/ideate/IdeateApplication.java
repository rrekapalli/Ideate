package com.ideate;

import com.ideate.auth.AuthProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(exclude = {UserDetailsServiceAutoConfiguration.class})
@EnableScheduling
@EnableAsync
@EnableConfigurationProperties({IdeateProperties.class, AuthProperties.class})
public class IdeateApplication {

    public static void main(String[] args) {
        SpringApplication.run(IdeateApplication.class, args);
    }
}
