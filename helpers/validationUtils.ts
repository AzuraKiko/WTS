/**
 * Common validation utilities for form data, numbers, and formats
 */

import { text } from "stream/consumers";

// Interface definitions
export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export interface NumberFormatOptions {
    allowNegative?: boolean;
    minValue?: number;
    maxValue?: number;
    decimalPlaces?: number;
}

export interface StockCodeValidationOptions {
    minLength?: number;
    maxLength?: number;
    caseSensitive?: boolean;
    pattern?: RegExp;
}

/**
 * Stock code validation utilities
 */
export class StockCodeValidator {
    // More flexible pattern to support stocks, warrants, ETFs with numbers and variable length
    private static readonly DEFAULT_PATTERN = /^[A-Z][A-Z0-9]{2,9}$/;
    private static readonly DEFAULT_MIN_LENGTH = 3;
    private static readonly DEFAULT_MAX_LENGTH = 10;

    /**
     * Validate stock code format
     */
    static validate(
        stockCode: string,
        options: StockCodeValidationOptions = {}
    ): ValidationResult {
        const errors: string[] = [];

        if (!stockCode || stockCode.trim() === '') {
            errors.push('Stock code is required');
            return { isValid: false, errors };
        }

        const trimmedCode = stockCode.trim();
        const {
            minLength = StockCodeValidator.DEFAULT_MIN_LENGTH,
            maxLength = StockCodeValidator.DEFAULT_MAX_LENGTH,
            caseSensitive = true,
            pattern = StockCodeValidator.DEFAULT_PATTERN
        } = options;

        // Length validation
        if (trimmedCode.length < minLength) {
            errors.push(`Stock code must be at least ${minLength} characters`);
        }
        if (trimmedCode.length > maxLength) {
            errors.push(`Stock code must not exceed ${maxLength} characters`);
        }

        // Case sensitivity
        const codeToCheck = caseSensitive ? trimmedCode : trimmedCode.toUpperCase();

        // Pattern validation
        if (!pattern.test(codeToCheck)) {
            errors.push('Stock code format is invalid');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Normalize stock code to standard format
     */
    static normalize(stockCode: string): string {
        return stockCode.trim().toUpperCase();
    }

    /**
     * Check if stock code exists in a list
     */
    static existsInList(stockCode: string, stockList: string[]): boolean {
        const normalizedCode = StockCodeValidator.normalize(stockCode);
        return stockList.some(code =>
            StockCodeValidator.normalize(code) === normalizedCode
        );
    }
}

/**
 * Number format validation utilities
 */
export class NumberValidator {
    private static readonly COMMA_FORMAT_PATTERN = /^-?(\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?)$/;
    private static readonly PERCENTAGE_PATTERN = /^-?(\d{1,3}(,\d{3})*(\.\d{2})?|\d+(\.\d{2})?)%$/;

    /**
     * Validate number format with comma thousands separator
     */
    static validateNumberFormat(
        value: string,
        fieldName: string,
        options: NumberFormatOptions = {}
    ): ValidationResult {
        const errors: string[] = [];

        if (!value || value.trim() === '') {
            errors.push(`${fieldName} is required`);
            return { isValid: false, errors };
        }

        const trimmedValue = value.trim();
        const { allowNegative = false, minValue, maxValue, decimalPlaces } = options;

        // Regex cơ bản (cho phép hoặc không cho số âm)
        const pattern = allowNegative
            ? NumberValidator.COMMA_FORMAT_PATTERN
            : /^(\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?)$/;

        if (!pattern.test(trimmedValue)) {
            errors.push(`${fieldName} has invalid format`);
            return { isValid: false, errors };
        }

        // Parse và validate numeric value
        const numericValue = NumberValidator.parseNumberWithCommas(trimmedValue);

        if (isNaN(numericValue)) {
            errors.push(`${fieldName} is not a valid number`);
        } else {
            // ✅ Kiểm tra đúng số chữ số sau dấu thập phân
            if (decimalPlaces !== undefined) {
                const decimalMatch = trimmedValue.split('.')[1];

                if (!decimalMatch || decimalMatch.length !== decimalPlaces) {
                    errors.push(
                        `${fieldName} must have exactly ${decimalPlaces} decimal place${decimalPlaces > 1 ? 's' : ''}`
                    );
                }
            }

            // ✅ Range validation
            if (minValue !== undefined && numericValue < minValue) {
                errors.push(`${fieldName} must be at least ${minValue}`);
            }

            if (maxValue !== undefined && numericValue > maxValue) {
                errors.push(`${fieldName} must not exceed ${maxValue}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate percentage format
     */
    static validatePercentageFormat(
        value: string,
        fieldName: string = 'Percentage'
    ): ValidationResult {
        const errors: string[] = [];

        if (!value || value.trim() === '') {
            errors.push(`${fieldName} is required`);
            return { isValid: false, errors };
        }

        const trimmedValue = value.trim();

        if (!trimmedValue.endsWith('%')) {
            errors.push(`${fieldName} must end with '%'`);
            return { isValid: false, errors };
        }

        if (!NumberValidator.PERCENTAGE_PATTERN.test(trimmedValue)) {
            errors.push(`${fieldName} has invalid format`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Parse number from string with comma format
     */
    static parseNumberWithCommas(value: string): number {
        return parseFloat(value.replace(/,/g, ''));
    }

    /**
     * Parse number from string with no comma format
     */
    static parseNumber(value: string): number {
        const normalized = value.trim()
            .replace(/[()%]/g, '') // Remove parentheses and percentage sign
            .replace(/,/g, '') // Remove commas
            .replace(/\s+/g, ''); // Remove spaces
        return Number.parseFloat(normalized); // Parse number
    }

    /**
     * Format number with comma thousands separator
     */
    static formatNumberWithCommas(
        value: number,
        decimalPlaces: number = 0
    ): string {
        return value.toLocaleString('en-US', {
            minimumFractionDigits: decimalPlaces,
            maximumFractionDigits: decimalPlaces
        });
    }

    /**
     * Validate quantity format (positive numbers only)
     */
    static validateQuantity(value: string, fieldName: string = 'Quantity', decimalPlaces: number = 0): ValidationResult {
        return NumberValidator.validateNumberFormat(value, fieldName, {
            allowNegative: false,
            minValue: 0,
            decimalPlaces: decimalPlaces
        });
    }

    /**
     * Validate price format (positive numbers only)
     */
    static validatePrice(value: string, fieldName: string = 'Price', decimalPlaces: number = 2): ValidationResult {
        return NumberValidator.validateNumberFormat(value, fieldName, {
            allowNegative: false,
            minValue: 0,
            decimalPlaces: decimalPlaces
        });
    }
}

/**
 * Form validation utilities
 */
export class FormValidator {
    /**
     * Validate required field
     */
    static validateRequired(value: string, fieldName: string): ValidationResult {
        const errors: string[] = [];

        if (!value || value.trim() === '') {
            errors.push(`${fieldName} is required`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate email format
     */
    static validateEmail(email: string): ValidationResult {
        const errors: string[] = [];
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email || email.trim() === '') {
            errors.push('Email is required');
        } else if (!emailPattern.test(email.trim())) {
            errors.push('Email format is invalid');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate field length
     */
    static validateLength(
        value: string,
        fieldName: string,
        minLength: number = 0,
        maxLength: number = Infinity
    ): ValidationResult {
        const errors: string[] = [];
        const trimmedValue = value?.trim() || '';

        if (trimmedValue.length < minLength) {
            errors.push(`${fieldName} must be at least ${minLength} characters`);
        }

        if (trimmedValue.length > maxLength) {
            errors.push(`${fieldName} must not exceed ${maxLength} characters`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Combine multiple validation results
     */
    static combineValidationResults(...results: ValidationResult[]): ValidationResult {
        const allErrors = results.flatMap(result => result.errors);

        return {
            isValid: allErrors.length === 0,
            errors: allErrors
        };
    }

    /**
     * Validate multiple fields at once
     */
    static validateFields(validations: (() => ValidationResult)[]): ValidationResult {
        const results = validations.map(validation => validation());
        return FormValidator.combineValidationResults(...results);
    }
}

/**
 * Data consistency validation utilities
 */
export class DataConsistencyValidator {
    /**
     * Validate order data consistency
     */
    static validateOrderData(orderData: any, index: number = 0): ValidationResult {
        const errors: string[] = [];

        // Required fields validation
        const requiredFields = ['stockCode', 'status', 'time'];
        requiredFields.forEach(field => {
            if (!orderData[field] || orderData[field].trim() === '') {
                errors.push(`Order ${index}: Missing ${field}`);
            }
        });

        // Quantity validation
        if (orderData.quantity) {
            const qty = parseFloat(orderData.quantity.replace(/[,\s]/g, ''));
            if (isNaN(qty) || qty <= 0) {
                errors.push(`Order ${index}: Invalid quantity: ${orderData.quantity}`);
            }
        }

        // Price validation (excluding market orders)
        if (orderData.price &&
            !orderData.price.includes('PLO') &&
            !orderData.price.includes('ATO') &&
            !orderData.price.includes('MTL') &&
            !orderData.price.includes('MOK') &&
            !orderData.price.includes('ATC') &&
            !orderData.price.includes('MAK')) {
            const price = parseFloat(orderData.price.replace(/[,\s]/g, ''));
            if (isNaN(price) || price <= 0) {
                errors.push(`Order ${index}: Invalid price: ${orderData.price}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate portfolio data consistency
     */
    static validatePortfolioData(portfolioData: any, index: number = 0): ValidationResult {
        const errors: string[] = [];

        // Stock code validation
        const stockCodeValidation = StockCodeValidator.validate(portfolioData.stockCode || '');
        if (!stockCodeValidation.isValid) {
            errors.push(`Portfolio ${index}: ${stockCodeValidation.errors.join(', ')}`);
        }

        // Numeric fields validation
        const numericFields = ['avgPrice', 'currentPrice'];
        numericFields.forEach(field => {
            if (portfolioData[field]) {
                const validation = NumberValidator.validatePrice(
                    portfolioData[field],
                    `${field} for portfolio ${index}`
                );
                if (!validation.isValid) {
                    errors.push(...validation.errors);
                }
            }
        });

        // Quantity validation
        if (portfolioData.quantity) {
            const quantityValidation = NumberValidator.validateQuantity(
                portfolioData.quantity,
                `Quantity for portfolio ${index}`
            );
            if (!quantityValidation.isValid) {
                errors.push(...quantityValidation.errors);
            }
        }

        // Percentage validation
        if (portfolioData.percentage) {
            const percentageValidation = NumberValidator.validatePercentageFormat(
                portfolioData.percentage,
                `Percentage for portfolio ${index}`
            );
            if (!percentageValidation.isValid) {
                errors.push(...percentageValidation.errors);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Export all validators as a single object for convenience
export const Validators = {
    StockCode: StockCodeValidator,
    Number: NumberValidator,
    Form: FormValidator,
    DataConsistency: DataConsistencyValidator
};

// Export common patterns
export const ValidationPatterns = {
    STOCK_CODE: /^[A-Z][A-Z0-9]{2,9}$/,
    NUMBER_WITH_COMMAS: /^-?(\d{1,3}(,\d{3})*(\.\d+)?|\d+(\.\d+)?)$/,
    PERCENTAGE: /^-?(\d{1,3}(,\d{3})*(\.\d{2})?|\d+(\.\d{2})?)%$/,
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};