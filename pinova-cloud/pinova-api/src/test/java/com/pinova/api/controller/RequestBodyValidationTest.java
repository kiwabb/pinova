package com.pinova.api.controller;

import com.pinova.api.assembler.PaymentOrderResponseAssembler;
import com.pinova.api.error.GlobalExceptionHandler;
import com.pinova.api.request.SubmitOrderLineRequest;
import com.pinova.api.request.SubmitOrderRequest;
import com.pinova.api.web.CurrentMemberResolver;
import com.pinova.service.PaymentOrderService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Valid;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.RequestBody;

import java.lang.reflect.Parameter;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class RequestBodyValidationTest {

    private PaymentOrderService paymentOrderService;
    private CurrentMemberResolver currentMemberResolver;
    private MockMvc mockMvc;
    private Validator validator;

    @BeforeEach
    void setUp() {
        paymentOrderService = mock(PaymentOrderService.class);
        currentMemberResolver = mock(CurrentMemberResolver.class);
        PaymentOrderController controller = new PaymentOrderController(
                paymentOrderService,
                mock(PaymentOrderResponseAssembler.class),
                currentMemberResolver);
        LocalValidatorFactoryBean validatorFactory = new LocalValidatorFactoryBean();
        validatorFactory.afterPropertiesSet();
        validator = validatorFactory;
        mockMvc = org.springframework.test.web.servlet.setup.MockMvcBuilders
                .standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validatorFactory)
                .build();
    }

    @Test
    void allRequestBodyParametersAreRequiredAndValidated() {
        List<Class<?>> controllers = List.of(
                AdminAuthenticationController.class,
                MemberAuthenticationController.class,
                ShoppingCartController.class,
                MemberShippingAddressController.class,
                TradeOrderController.class,
                PaymentOrderController.class);

        List<Parameter> bodyParameters = controllers.stream()
                .flatMap(controller -> List.of(controller.getDeclaredMethods()).stream())
                .flatMap(method -> List.of(method.getParameters()).stream())
                .filter(parameter -> parameter.isAnnotationPresent(RequestBody.class))
                .toList();

        assertEquals(12, bodyParameters.size());
        bodyParameters.forEach(parameter -> {
            RequestBody requestBody = parameter.getAnnotation(RequestBody.class);
            assertNotNull(parameter.getAnnotation(Valid.class));
            assertEquals(true, requestBody.required());
        });
    }

    @Test
    void missingRequestBodyReturnsBadRequestWithoutCallingApplicationCode() throws Exception {
        mockMvc.perform(post("/payments").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("请求体格式错误"));

        verifyNoInteractions(currentMemberResolver, paymentOrderService);
    }

    @Test
    void invalidRequestFieldReturnsBadRequestWithoutCallingApplicationCode() throws Exception {
        mockMvc.perform(post("/payments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"checkoutNo\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors[0].field").value("checkoutNo"));

        verifyNoInteractions(currentMemberResolver, paymentOrderService);
    }

    @Test
    void submitOrderRejectsNullLineElements() {
        SubmitOrderRequest request = new SubmitOrderRequest(
                1L, 1L, 0, Arrays.asList((SubmitOrderLineRequest) null), null);

        Set<ConstraintViolation<SubmitOrderRequest>> violations = validator.validate(request);

        assertTrue(violations.stream()
                .map(violation -> violation.getPropertyPath().toString())
                .anyMatch(path -> path.startsWith("items[0]")));
    }

    @Test
    void submitOrderCascadesValidationToLineFields() {
        SubmitOrderRequest request = new SubmitOrderRequest(
                1L, 1L, 0, List.of(new SubmitOrderLineRequest(1L, 0, null, 0L)), null);

        Set<String> invalidPaths = validator.validate(request).stream()
                .map(violation -> violation.getPropertyPath().toString())
                .collect(java.util.stream.Collectors.toSet());

        assertTrue(invalidPaths.contains("items[0].skuId"));
        assertTrue(invalidPaths.contains("items[0].quantity"));
    }
}
