package com.pinova.api.response;

import com.fasterxml.jackson.databind.JsonNode;

public record ProductDetailContentResponse(
        int contentSchemaVersion,
        JsonNode document,
        String packingList,
        String usageInstructions,
        String afterSalesNote) {
}
