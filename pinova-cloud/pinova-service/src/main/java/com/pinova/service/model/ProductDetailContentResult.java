package com.pinova.service.model;

public record ProductDetailContentResult(
        int contentSchemaVersion,
        String detailDocumentJson,
        String packingList,
        String usageInstructions,
        String afterSalesNote) {
}
