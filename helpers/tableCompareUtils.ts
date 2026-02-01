import { NumberValidator } from './validationUtils';

function numbersEqual(apiValue: unknown, uiValue: unknown): boolean {
    const apiNum = NumberValidator.parseNumber(String(apiValue ?? ''));
    const uiNum = NumberValidator.parseNumber(String(uiValue ?? ''));

    if (Number.isNaN(apiNum) && Number.isNaN(uiNum)) {
        return true;
    }

    return apiNum === uiNum;
}

function stringsEqual(apiValue: unknown, uiValue: unknown): boolean {
    const apiText = String(apiValue ?? '').trim();
    const uiText = String(uiValue ?? '').trim();
    return apiText === uiText;
}

export function findUiRowByKey(
    uiRows: Record<string, string>[],
    uiKey: string,
    keyValue: string
): Record<string, string> | undefined {
    const normalizedKey = String(keyValue ?? '').trim();
    return uiRows.find(row => String(row[uiKey] ?? '').trim() === normalizedKey);
}

export function compareApiRowWithUiRow(
    apiRow: Record<string, unknown>,
    uiRow: Record<string, string>,
    columnMap: Record<string, string>,
    numericKeys: string[] = []
): string[] {
    const mismatches: string[] = [];

    for (const [apiKey, uiHeader] of Object.entries(columnMap)) {
        if (!(uiHeader in uiRow)) {
            mismatches.push(`Missing UI column: ${uiHeader}`);
            continue;
        }

        const apiValue = apiRow[apiKey];
        const uiValue = uiRow[uiHeader];
        const isNumeric = numericKeys.includes(apiKey);

        const matched = isNumeric
            ? numbersEqual(apiValue, uiValue)
            : stringsEqual(apiValue, uiValue);

        if (!matched) {
            mismatches.push(
                `${apiKey} mismatch (api="${String(apiValue ?? '')}" ui="${String(uiValue ?? '')}")`
            );
        }
    }

    return mismatches;
}

export type CompareRowsOptions = {
    limit?: number;
};

export function compareApiRowsWithUiRows(
    apiRows: Record<string, unknown>[],
    uiRows: Record<string, string>[],
    columnMap: Record<string, string>,
    numericKeys: string[] = [],
    options: CompareRowsOptions = {}
): string[] {
    const mismatches: string[] = [];
    const limit = options.limit ?? apiRows.length;
    const maxRows = Math.min(limit, apiRows.length);

    for (let i = 0; i < maxRows; i++) {
        const apiRow = apiRows[i];
        const keyValue = String(apiRow.stockCode ?? '');
        const uiRow = findUiRowByKey(uiRows, columnMap.stockCode, keyValue);
        if (!uiRow) {
            mismatches.push(`Missing UI row for stockCode ${keyValue}`);
            continue;
        }

        const rowMismatches = compareApiRowWithUiRow(apiRow, uiRow, columnMap, numericKeys);
        if (rowMismatches.length) {
            mismatches.push(...rowMismatches.map(item => `[${keyValue}] ${item}`));
        }
    }

    return mismatches;
}
