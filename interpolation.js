// Load and parse CSV data
let table20Data = [];
let table21Data = [];

// Load CSV files
async function loadCSVData() {
    try {
        // Load Table 20 (100m/200m controls)
        const response20 = await fetch('table20_100m_200m_controls.csv');
        const csv20 = await response20.text();
        table20Data = parseCSV(csv20);

        // Load Table 21 (400m/200m endurance controls)
        const response21 = await fetch('table21_400m_200m_endurance_controls.csv');
        const csv21 = await response21.text();
        table21Data = parseCSV(csv21);

        console.log('CSV data loaded successfully');
    } catch (error) {
        console.error('Error loading CSV files:', error);
    }
}

// Parse CSV text into array of objects
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index];
        });
        data.push(row);
    }

    return data;
}

// Parse value string and return as number
function parseRange(rangeStr) {
    if (!rangeStr || rangeStr === '') return null;
    
    // Handle time format with colons (e.g., "6:49")
    if (rangeStr.includes(':')) {
        const [min, sec] = rangeStr.split(':').map(parseFloat);
        return min * 60 + sec;
    }
    
    // Handle regular decimal format
    return parseFloat(rangeStr);
}

// Find the two closest rows in table based on input time for a specific column
function findBracketingRows(data, columnName, inputTime) {
    let lowerRow = null;
    let upperRow = null;
    let lowerDiff = Infinity;
    let upperDiff = Infinity;

    for (const row of data) {
        const rangeStr = row[columnName];
        if (!rangeStr || rangeStr === '') continue;

        const timeValue = parseRange(rangeStr);
        if (timeValue === null) continue;

        const diff = timeValue - inputTime;

        if (diff <= 0 && Math.abs(diff) < lowerDiff) {
            lowerDiff = Math.abs(diff);
            lowerRow = row;
        }

        if (diff >= 0 && Math.abs(diff) < upperDiff) {
            upperDiff = Math.abs(diff);
            upperRow = row;
        }
    }

    return { lowerRow, upperRow };
}

// Linear interpolation between two values
function interpolate(x, x0, x1, y0, y1) {
    if (x1 === x0) return y0;
    return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

// Main function: takes distance (in meters or string like '30-fly') and time (in seconds), returns predicted times
function predictTimes(inputDistance, inputTime) {
    const results = {};
    
    // Determine which table to use based on input distance
    let sourceTable = null;
    let sourceColumn = null;

    // Check Table 20 columns (30m Blocks, 30m Fly, 60m, 100m, 150m, 200m, 250m)
    const table20Distances = {
        '30-blocks': '30m from Blocks',
        '30-fly': '30m Fly',
        '60': '60m',
        '100': '100m',
        '150': '150m',
        '200': '200m',
        '250': '250m'
    };

    // Check Table 21 columns (150m, 200m, 300m, 400m, 600m)
    const table21Distances = {
        '150': '150m',
        '200': '200m',
        '300': '300m',
        '400': '400m',
        '600': '600m'
    };

    // Determine source table and column
    if (table20Distances[inputDistance.toString()]) {
        sourceTable = table20Data;
        sourceColumn = table20Distances[inputDistance.toString()];
    } else if (table21Distances[inputDistance.toString()]) {
        sourceTable = table21Data;
        sourceColumn = table21Distances[inputDistance.toString()];
    } else {
        return { error: `Distance ${inputDistance} not found in tables. Available distances: 30m Fly, 30m Blocks, 60m, 100m, 150m, 200m, 250m, 300m, 400m, 600m` };
    }

    // Get valid range for this distance
    const validRange = getValidRangeForDistance(sourceTable, sourceColumn);
    if (!validRange) {
        return { error: 'Unable to determine valid range for this distance' };
    }

    // Check if input time is within valid range
    if (inputTime < validRange.min || inputTime > validRange.max) {
        const distanceLabel = inputDistance.toString().includes('-') 
            ? inputDistance.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
            : `${inputDistance}m`;
        return { 
            error: `Time is outside the valid range for ${distanceLabel} - valid range is ${validRange.min.toFixed(2)}s to ${validRange.max.toFixed(2)}s` 
        };
    }

    // Find bracketing rows
    const { lowerRow, upperRow } = findBracketingRows(sourceTable, sourceColumn, inputTime);

    if (!lowerRow && !upperRow) {
        return { error: 'Input time is outside the range of the data. Please enter a time within the performance tables range.' };
    }

    // Use exact match or interpolate
    const x0 = lowerRow ? parseRange(lowerRow[sourceColumn]) : parseRange(upperRow[sourceColumn]);
    const x1 = upperRow ? parseRange(upperRow[sourceColumn]) : parseRange(lowerRow[sourceColumn]);

    // Interpolate for all columns in the source table
    const allColumns = sourceTable === table20Data 
        ? Object.values(table20Distances)
        : Object.values(table21Distances);

    allColumns.forEach(column => {
        const columnKey = Object.keys(sourceTable === table20Data ? table20Distances : table21Distances)
            .find(key => (sourceTable === table20Data ? table20Distances : table21Distances)[key] === column);

        if (lowerRow && upperRow && lowerRow !== upperRow) {
            const y0 = parseRange(lowerRow[column]);
            const y1 = parseRange(upperRow[column]);
            if (y0 !== null && y1 !== null) {
                results[columnKey] = interpolate(inputTime, x0, x1, y0, y1);
            }
        } else {
            // Exact match or extrapolation
            const row = lowerRow || upperRow;
            const value = parseRange(row[column]);
            if (value !== null) {
                results[columnKey] = value;
            }
        }
    });

    // Add cross-table predictions - always bridge via 200m
    if (sourceTable === table21Data) {
        // We're in Table 21, get Table 20 predictions via 200m
        if (results['200']) {
            const table20Results = predictFromTable20('200', results['200']);
            Object.assign(results, table20Results);
        }
    } else if (sourceTable === table20Data) {
        // We're in Table 20, get Table 21 predictions via 200m
        if (results['200']) {
            const table21Results = predictFromTable21('200', results['200']);
            Object.assign(results, table21Results);
        }
    }

    // Now interpolate for missing distances (120m, 180m, 350m, 500m)
    results['120'] = interpolateDistance(results, 100, 150, 120);
    results['180'] = interpolateDistance(results, 150, 200, 180);
    results['350'] = interpolateDistance(results, 300, 400, 350);
    results['500'] = interpolateDistance(results, 400, 600, 500);

    return results;
}

// Get the valid min and max range for a specific distance column
function getValidRangeForDistance(table, columnName) {
    let min = Infinity;
    let max = -Infinity;

    for (const row of table) {
        const rangeStr = row[columnName];
        if (!rangeStr || rangeStr === '') continue;
        
        const value = parseRange(rangeStr);
        if (value !== null && !isNaN(value)) {
            min = Math.min(min, value);
            max = Math.max(max, value);
        }
    }

    if (min === Infinity || max === -Infinity) {
        return null;
    }

    return { min, max };
}

// Helper function to interpolate time for a distance between two known distances
function interpolateDistance(results, dist1, dist2, targetDist) {
    const time1 = results[dist1.toString()];
    const time2 = results[dist2.toString()];
    
    if (time1 === undefined || time2 === undefined) {
        return null;
    }
    
    return time1 + (targetDist - dist1) * (time2 - time1) / (dist2 - dist1);
}

// Helper: Predict times from Table 20 given a distance and time
function predictFromTable20(distance, time) {
    const table20Distances = {
        '30-blocks': '30m from Blocks',
        '30-fly': '30m Fly',
        '60': '60m',
        '100': '100m',
        '150': '150m',
        '200': '200m',
        '250': '250m'
    };
    
    const results = {};
    const { lowerRow, upperRow } = findBracketingRows(table20Data, table20Distances[distance], time);
    
    if (!lowerRow && !upperRow) return results;

    const x0 = lowerRow ? parseRange(lowerRow[table20Distances[distance]]) : parseRange(upperRow[table20Distances[distance]]);
    const x1 = upperRow ? parseRange(upperRow[table20Distances[distance]]) : parseRange(lowerRow[table20Distances[distance]]);

    Object.keys(table20Distances).forEach(dist => {
        const column = table20Distances[dist];
        if (lowerRow && upperRow && lowerRow !== upperRow) {
            const y0 = parseRange(lowerRow[column]);
            const y1 = parseRange(upperRow[column]);
            if (y0 !== null && y1 !== null) {
                results[dist] = interpolate(time, x0, x1, y0, y1);
            }
        } else {
            const row = lowerRow || upperRow;
            const value = parseRange(row[column]);
            if (value !== null) {
                results[dist] = value;
            }
        }
    });

    return results;
}

// Helper: Predict times from Table 21 given a distance and time
function predictFromTable21(distance, time) {
    const table21Distances = {
        '150': '150m',
        '200': '200m',
        '300': '300m',
        '400': '400m',
        '600': '600m'
    };
    
    const results = {};
    const { lowerRow, upperRow } = findBracketingRows(table21Data, table21Distances[distance], time);
    
    if (!lowerRow && !upperRow) return results;

    const x0 = lowerRow ? parseRange(lowerRow[table21Distances[distance]]) : parseRange(upperRow[table21Distances[distance]]);
    const x1 = upperRow ? parseRange(upperRow[table21Distances[distance]]) : parseRange(lowerRow[table21Distances[distance]]);

    Object.keys(table21Distances).forEach(dist => {
        const column = table21Distances[dist];
        if (lowerRow && upperRow && lowerRow !== upperRow) {
            const y0 = parseRange(lowerRow[column]);
            const y1 = parseRange(upperRow[column]);
            if (y0 !== null && y1 !== null) {
                results[dist] = interpolate(time, x0, x1, y0, y1);
            }
        } else {
            const row = lowerRow || upperRow;
            const value = parseRange(row[column]);
            if (value !== null) {
                results[dist] = value;
            }
        }
    });

    return results;
}

// Initialize on page load
loadCSVData();

// Example usage (commented out):
// predictTimes(100, 12.5)
// predictTimes(400, 55)
