package com.pinova.api.response;public record AdminStockResponse(String id,String warehouseId,String skuId,long onHandQuantity,long reservedQuantity,long availableQuantity,int version){}
