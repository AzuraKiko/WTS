export const logSimple = (message: string, data?: any) => {
    console.log(`[LOG] ${message}`);
    if (data !== undefined) {
        console.log(data);
    }
};

export const logTable = (result: any[], columnNames: string[] = []) => {
    if (!result || result.length === 0) {
        console.log('No data to display');
        return;
    }

    // If no column names provided, use all keys from first object
    if (columnNames.length === 0 && result[0]) {
        columnNames = Object.keys(result[0]);
    }

    console.log('-'.repeat(50));
    console.table(result.map(row => {
        const filteredRow: any = {};
        columnNames.forEach(columnName => {
            filteredRow[columnName] = row[columnName];
        });
        return filteredRow;
    }));
    console.log('-'.repeat(50));
};

// Keep the original function for backward compatibility
export const loggerSimple = (result: any[] | any, columnNames: string[] = []) => {
    // Handle single object case
    if (!Array.isArray(result)) {
        console.log('--------------------------');
        columnNames.forEach(columnName => {
            console.log(columnName, result[columnName])
        });
        console.log('--------------------------');
        return;
    }

    // Handle array case
    result.forEach(row => {
        console.log('--------------------------');
        columnNames.forEach(columnName => {
            console.log(columnName, row[columnName])
        })
    });
    console.log('--------------------------');
};
