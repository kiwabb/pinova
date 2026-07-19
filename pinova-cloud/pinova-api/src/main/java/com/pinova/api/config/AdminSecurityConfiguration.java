package com.pinova.api.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pinova.api.web.TraceIdFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

import java.net.URI;

@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
public class AdminSecurityConfiguration {
    @Bean
    @Order(1)
    SecurityFilterChain adminSecurityFilterChain(HttpSecurity http, ObjectMapper objectMapper) throws Exception {
        CookieCsrfTokenRepository csrfRepository = new CookieCsrfTokenRepository();
        csrfRepository.setCookieName("PINOVA_ADMIN_CSRF");
        csrfRepository.setHeaderName("X-PINOVA-ADMIN-CSRF");
        csrfRepository.setCookiePath("/");
        csrfRepository.setCookieCustomizer(builder -> builder.sameSite("Strict"));

        http.securityMatcher("/admin/**")
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepository))
                .exceptionHandling(exceptions -> exceptions.accessDeniedHandler((request, response, exception) -> {
                            ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                                    HttpStatus.FORBIDDEN, "CSRF 校验失败，请刷新页面后重试");
                            problem.setTitle("请求安全校验失败");
                            problem.setInstance(URI.create(request.getRequestURI()));
                            problem.setProperty("code", "ADMIN_AUTH.CSRF_INVALID");
                            String traceId = MDC.get(TraceIdFilter.MDC_KEY);
                            if (traceId != null) {
                                problem.setProperty("traceId", traceId);
                            }
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
                            objectMapper.writeValue(response.getOutputStream(), problem);
                        }))
                .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll())
                .httpBasic(httpBasic -> httpBasic.disable())
                .formLogin(formLogin -> formLogin.disable())
                .logout(logout -> logout.disable())
                .cors(Customizer.withDefaults());
        return http.build();
    }
}
