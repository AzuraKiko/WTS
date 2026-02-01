import fs from 'fs/promises';
import { NumberValidator } from './validationUtils';

export type CsvTable = {
    headers: string[];
    rows: string[][];
};

function parseCsvContent(content: string): CsvTable {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const next = content[i + 1];

        if (inQuotes) {
            if (char === '"') {
                if (next === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            inQuotes = true;
            continue;
        }

        if (char === ',') {
            row.push(field.trim());
            field = '';
            continue;
        }

        if (char === '\n') {
            row.push(field.trim());
            field = '';
            if (row.length > 1 || row[0]?.length) {
                rows.push(row);
            }
            row = [];
            continue;
        }

        if (char === '\r') {
            continue;
        }

        field += char;
    }

    if (field.length || row.length) {
        row.push(field.trim());
        if (row.length > 1 || row[0]?.length) {
            rows.push(row);
        }
    }

    const headers = rows.shift() || [];
    return { headers: headers.map(header => header.trim()), rows };
}

export async function parseCsvFile(filePath: string): Promise<CsvTable> {
    const content = await fs.readFile(filePath, 'utf8');
    return parseCsvContent(content);
}

export function mapCsvRows(headers: string[], rows: string[][]): Record<string, string>[] {
    return rows.map(row => {
        const data: Record<string, string> = {};
        headers.forEach((header, index) => {
            data[header] = row[index] ?? '';
        });
        return data;
    });
}

function numbersEqual(apiValue: unknown, csvValue: unknown): boolean {
    const apiNum = NumberValidator.parseNumber(String(apiValue ?? ''));
    const csvNum = NumberValidator.parseNumber(String(csvValue ?? ''));

    if (Number.isNaN(apiNum) && Number.isNaN(csvNum)) {
        return true;
    }

    return apiNum === csvNum;
}

function stringsEqual(apiValue: unknown, csvValue: unknown): boolean {
    const apiText = String(apiValue ?? '').trim();
    const csvText = String(csvValue ?? '').trim();
    return apiText === csvText;
}

export function compareApiRowWithCsvRow(
    apiRow: Record<string, unknown>,
    csvRow: Record<string, string>,
    columnMap: Record<string, string>,
    numericKeys: string[] = []
): string[] {
    const mismatches: string[] = [];

    for (const [apiKey, csvHeader] of Object.entries(columnMap)) {
        if (!(csvHeader in csvRow)) {
            mismatches.push(`Missing CSV column: ${csvHeader}`);
            continue;
        }

        const apiValue = apiRow[apiKey];
        const csvValue = csvRow[csvHeader];
        const isNumeric = numericKeys.includes(apiKey);

        const matched = isNumeric
            ? numbersEqual(apiValue, csvValue)
            : stringsEqual(apiValue, csvValue);

        if (!matched) {
            mismatches.push(
                `${apiKey} mismatch (api="${String(apiValue ?? '')}" csv="${String(csvValue ?? '')}")`
            );
        }
    }

    return mismatches;
}
