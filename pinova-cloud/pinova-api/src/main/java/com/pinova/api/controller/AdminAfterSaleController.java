package com.pinova.api.controller;
import com.pinova.api.assembler.AfterSaleResponseAssembler;import com.pinova.api.request.ReviewAfterSaleRequest;import com.pinova.api.response.AfterSaleResponse;import com.pinova.api.web.CurrentAdminResolver;
import com.pinova.common.api.ApiResponse;import com.pinova.service.AfterSaleService;import com.pinova.service.command.ReviewAfterSaleCommand;import jakarta.servlet.http.HttpServletRequest;import jakarta.validation.Valid;import org.springframework.web.bind.annotation.*;import java.util.List;
@RestController @RequestMapping("/admin/after-sales")
public class AdminAfterSaleController {
    private final AfterSaleService service;private final AfterSaleResponseAssembler assembler;private final CurrentAdminResolver adminResolver;
    public AdminAfterSaleController(AfterSaleService service,AfterSaleResponseAssembler assembler,CurrentAdminResolver adminResolver){this.service=service;this.assembler=assembler;this.adminResolver=adminResolver;}
    @GetMapping public ApiResponse<List<AfterSaleResponse>> list(HttpServletRequest r){return ApiResponse.success(service.listAdminAfterSales(adminResolver.requireCurrentAdmin(r)).stream().map(assembler::toResponse).toList());}
    @PostMapping("/{no}/review") public ApiResponse<AfterSaleResponse> review(@PathVariable String no,@Valid @RequestBody ReviewAfterSaleRequest b,HttpServletRequest r){return ApiResponse.success(assembler.toResponse(service.review(new ReviewAfterSaleCommand(adminResolver.requireCurrentAdmin(r),no,b.version(),b.approved(),b.reason()))));}
    @PostMapping("/{no}/refund/retry") public ApiResponse<AfterSaleResponse> retry(@PathVariable String no,HttpServletRequest r){return ApiResponse.success(assembler.toResponse(service.retryRefund(adminResolver.requireCurrentAdmin(r),no)));}
    @PostMapping("/{no}/refund/reconcile") public ApiResponse<AfterSaleResponse> reconcile(@PathVariable String no,HttpServletRequest r){return ApiResponse.success(assembler.toResponse(service.reconcileRefund(adminResolver.requireCurrentAdmin(r),no)));}
}
