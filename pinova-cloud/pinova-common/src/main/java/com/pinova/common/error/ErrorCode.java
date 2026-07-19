package com.pinova.common.error;

/**
 * Stable error contract shared by business and transport layers.
 */
public interface ErrorCode {

    String code();

    String message();

    int httpStatus();
}
