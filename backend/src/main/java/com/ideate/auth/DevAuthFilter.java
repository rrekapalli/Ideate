package com.ideate.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class DevAuthFilter extends OncePerRequestFilter {

    public static final String ACCOUNT_ATTR = "ideate.accountId";

    private final AuthProperties authProperties;

    public DevAuthFilter(AuthProperties authProperties) {
        this.authProperties = authProperties;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        request.setAttribute(ACCOUNT_ATTR, authProperties.getDevAccountId());
        filterChain.doFilter(request, response);
    }
}
