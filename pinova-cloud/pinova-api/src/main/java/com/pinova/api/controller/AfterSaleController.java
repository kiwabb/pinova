package com.pinova.api.controller;
import com.pinova.api.assembler.AfterSaleResponseAssembler;import com.pinova.api.request.ApplyAfterSaleRequest;import com.pinova.api.response.AfterSaleResponse;
import com.pinova.api.web.CurrentMemberResolver;import com.pinova.common.api.ApiResponse;import com.pinova.service.AfterSaleService;import com.pinova.service.command.ApplyAfterSaleCommand;
import jakarta.servlet.http.HttpServletRequest;import jakarta.validation.Valid;import org.springframework.web.bind.annotation.*;import java.util.List;
@RestController @RequestMapping("/after-sales")
public class AfterSaleController {
    private final AfterSaleService service;private final AfterSaleResponseAssembler assembler;private final CurrentMemberResolver memberResolver;
    public AfterSaleController(AfterSaleService service,AfterSaleResponseAssembler assembler,CurrentMemberResolver memberResolver){this.service=service;this.assembler=assembler;this.memberResolver=memberResolver;}
    @GetMapping public ApiResponse<List<AfterSaleResponse>> list(HttpServletRequest request){return ApiResponse.success(service.listMemberAfterSales(memberResolver.requireCurrentMemberId(request)).stream().map(assembler::toResponse).toList());}
    @PostMapping("/orders/{orderNo}") public ApiResponse<AfterSaleResponse> apply(@PathVariable String orderNo,@RequestHeader("Idempotency-Key") String key,@Valid @RequestBody ApplyAfterSaleRequest body,HttpServletRequest request){
        return ApiResponse.success(assembler.toResponse(service.apply(new ApplyAfterSaleCommand(memberResolver.requireCurrentMemberId(request),orderNo,key,body.reasonCode(),body.reason()))));}
}
