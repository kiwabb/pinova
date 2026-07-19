package com.pinova.api.controller;

import com.pinova.api.assembler.ShoppingCartResponseAssembler;
import com.pinova.api.request.AddShoppingCartItemRequest;
import com.pinova.api.request.UpdateShoppingCartItemRequest;
import com.pinova.api.response.ShoppingCartResponse;
import com.pinova.common.api.ApiResponse;
import com.pinova.service.ShoppingCartService;
import com.pinova.service.command.AddShoppingCartItemCommand;
import com.pinova.service.command.UpdateShoppingCartItemCommand;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.SecureRandom;
import java.util.Base64;

/**
 * <p>
 * 会员或游客购物车 前端控制器
 * </p>
 *
 * @author Pinova
 * @since 2026-07-16
 */
@Tag(name = "购物车管理", description = "会员与游客购物车管理接口")
@RestController
@RequestMapping("/shopping-carts")
public class ShoppingCartController {

    private static final String CART_TOKEN_COOKIE = "PINOVA_CART_TOKEN";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private final ShoppingCartService shoppingCartService;
    private final ShoppingCartResponseAssembler shoppingCartResponseAssembler;

    public ShoppingCartController(
            ShoppingCartService shoppingCartService,
            ShoppingCartResponseAssembler shoppingCartResponseAssembler) {
        this.shoppingCartService = shoppingCartService;
        this.shoppingCartResponseAssembler = shoppingCartResponseAssembler;
    }

    @Operation(summary = "获取当前游客购物车")
    @GetMapping("/current")
    public ApiResponse<ShoppingCartResponse> getCurrentCart(HttpServletRequest request, HttpServletResponse response) {
        String token = resolveOrIssueGuestToken(request, response);
        return ApiResponse.success(shoppingCartResponseAssembler.toCartResponse(shoppingCartService.getGuestCart(token)));
    }

    @Operation(summary = "加入当前游客购物车")
    @PostMapping("/current/items")
    public ApiResponse<ShoppingCartResponse> addItem(
            @RequestBody AddShoppingCartItemRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        String token = resolveOrIssueGuestToken(servletRequest, servletResponse);
        return ApiResponse.success(shoppingCartResponseAssembler.toCartResponse(shoppingCartService.addGuestCartItem(
                new AddShoppingCartItemCommand(token, request.skuId(), request.quantity()))));
    }

    @Operation(summary = "更新当前游客购物车项")
    @PatchMapping("/current/items/{itemId}")
    public ApiResponse<ShoppingCartResponse> updateItem(
            @PathVariable Long itemId,
            @RequestBody UpdateShoppingCartItemRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        String token = resolveOrIssueGuestToken(servletRequest, servletResponse);
        return ApiResponse.success(shoppingCartResponseAssembler.toCartResponse(shoppingCartService.updateGuestCartItem(
                new UpdateShoppingCartItemCommand(token, itemId, request.quantity(), request.selected(), request.version()))));
    }

    @Operation(summary = "移除当前游客购物车项")
    @DeleteMapping("/current/items/{itemId}")
    public ApiResponse<Void> removeItem(
            @PathVariable Long itemId,
            HttpServletRequest request,
            HttpServletResponse response) {
        shoppingCartService.removeGuestCartItem(resolveOrIssueGuestToken(request, response), itemId);
        return ApiResponse.success();
    }

    private static String resolveOrIssueGuestToken(HttpServletRequest request, HttpServletResponse response) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (CART_TOKEN_COOKIE.equals(cookie.getName()) && !cookie.getValue().isBlank()) return cookie.getValue();
            }
        }
        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        Cookie cookie = new Cookie(CART_TOKEN_COOKIE, token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(30 * 24 * 60 * 60);
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.getName() + "=" + cookie.getValue()
                + "; Path=/; Max-Age=" + cookie.getMaxAge() + "; HttpOnly; SameSite=Lax");
        return token;
    }

}
