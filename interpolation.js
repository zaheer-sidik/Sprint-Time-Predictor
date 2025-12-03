let table20Data = [];
let table21Data = [];

async function loadCSVData() {
    try {
        const response20 = await fetch('table20_100m_200m_controls.csv');
        const csv20 = await response20.text();
        table20Data = parseCSV(csv20);

        const response21 = await fetch('table21_400m_200m_endurance_controls.csv');
        const csv21 = await response21.text();
        table21Data = parseCSV(csv21);

        console.log('CSV data loaded successfully');
    } catch (error) {
        console.error('Error loading CSV files:', error);
    }
}

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

function parseValue(valueStr) {
    if (!valueStr || valueStr.trim() === '') return null;
    
    if (valueStr.includes('.')) {
        const parts = valueStr.split('.');
        const minutes = parseInt(parts[0]);
        const seconds = parseFloat(parts[1]);
        return minutes * 60 + seconds;
    }
    
    const value = parseFloat(valueStr);
    return isNaN(value) ? null : value;
}

function findClosestRows(data, columnName, inputTime) {
    let lowerRow = null;
    let upperRow = null;
    let lowerDiff = Infinity;
    let upperDiff = Infinity;

    for (const row of data) {
        const valueStr = row[columnName];
        if (!valueStr || valueStr === '') continue;

        const timeValue = parseValue(valueStr);
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

function interpolate(x, x0, x1, y0, y1) {
    if (x1 === x0) return y0;
    return y0 + (x - x0) * (y1 - y0) / (x1 - x0);
}

function predictTimes(inputDistance, inputTime) {
    const results = {};
    
    let sourceTable = null;
    let sourceColumn = null;

    // Check Table 20
    const table20Distances = {
        '30-blocks': '30m from Blocks',
        '30-fly': '30m Fly',
        '60': '60m',
        '100': '100m',
        '150': '150m',
        '200': '200m',
        '250': '250m'
    };

    // Check Table 21
    const table21Distances = {
        '150': '150m',
        '200': '200m',
        '300': '300m',
        '400': '400m',
        '600': '600m'
    };

    if (table20Distances[inputDistance.toString()]) {
        sourceTable = table20Data;
        sourceColumn = table20Distances[inputDistance.toString()];
    } else if (table21Distances[inputDistance.toString()]) {
        sourceTable = table21Data;
        sourceColumn = table21Distances[inputDistance.toString()];
    } else {
        return { error: `Distance ${inputDistance} not found in tables. Available distances: 30m Fly, 30m Blocks, 60m, 100m, 150m, 200m, 250m, 300m, 400m, 600m` };
    }

    const validRange = getValidTimesForDistance(sourceTable, sourceColumn);
    if (!validRange) {
        return { error: 'Unable to determine valid range for this distance' };
    }

    if (inputTime < validRange.min || inputTime > validRange.max) {
        const distanceLabel = inputDistance.toString().includes('-') 
            ? inputDistance.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
            : `${inputDistance}m`;
        return { 
            error: `Time is outside the valid range for ${distanceLabel} - valid range is ${validRange.min.toFixed(2)}s to ${validRange.max.toFixed(2)}s` 
        };
    }

    const { lowerRow, upperRow } = findClosestRows(sourceTable, sourceColumn, inputTime);

    if (!lowerRow && !upperRow) {
        return { error: 'Input time is outside the range of the data. Please enter a time within the performance tables range.' };
    }

    const x0 = lowerRow ? parseValue(lowerRow[sourceColumn]) : parseValue(upperRow[sourceColumn]);
    const x1 = upperRow ? parseValue(upperRow[sourceColumn]) : parseValue(lowerRow[sourceColumn]);

    const allColumns = sourceTable === table20Data 
        ? Object.values(table20Distances)
        : Object.values(table21Distances);

    allColumns.forEach(column => {
        const columnKey = Object.keys(sourceTable === table20Data ? table20Distances : table21Distances)
            .find(key => (sourceTable === table20Data ? table20Distances : table21Distances)[key] === column);

        // Preserve the input time
        if (column === sourceColumn) {
            results[columnKey] = inputTime;
        } else if (lowerRow && upperRow && lowerRow !== upperRow) {
            const y0 = parseValue(lowerRow[column]);
            const y1 = parseValue(upperRow[column]);
            if (y0 !== null && y1 !== null) {
                results[columnKey] = interpolate(inputTime, x0, x1, y0, y1);
            }
        } else {
            // Exact match or edge of table
            const row = lowerRow || upperRow;
            const value = parseValue(row[column]);
            if (value !== null) {
                results[columnKey] = value;
            }
        }
    });

    // Add cross-table predictions - bridge via 200m
    if (sourceTable === table21Data) {
        if (results['200']) {
            const table20Results = predictFromTable20('200', results['200']);
            // Only copy distances unique to Table 20
            ['30-blocks', '30-fly', '60', '100', '250'].forEach(dist => {
                if (table20Results[dist] !== undefined) {
                    results[dist] = table20Results[dist];
                }
            });
        }
    } else if (sourceTable === table20Data) {
        if (results['200']) {
            const table21Results = predictFromTable21('200', results['200']);
            // Only copy distances unique to Table 21
            ['300', '400', '600'].forEach(dist => {
                if (table21Results[dist] !== undefined) {
                    results[dist] = table21Results[dist];
                }
            });
        }
    }

    // Restore the input value for the input column
    const inputColumnKey = Object.keys(sourceTable === table20Data ? table20Distances : table21Distances)
        .find(key => (sourceTable === table20Data ? table20Distances : table21Distances)[key] === sourceColumn);
    results[inputColumnKey] = inputTime;

    results['120'] = interpolateDistance(results, 100, 150, 120);
    results['180'] = interpolateDistance(results, 150, 200, 180);
    results['350'] = interpolateDistance(results, 300, 400, 350);
    results['500'] = interpolateDistance(results, 400, 600, 500);

    return results;
}


function getValidTimesForDistance(table, columnName) {
    let min = Infinity;
    let max = -Infinity;

    for (const row of table) {
        const valueStr = row[columnName];
        if (!valueStr || valueStr === '') continue;
        
        const value = parseValue(valueStr);
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

function interpolateDistance(results, dist1, dist2, targetDist) {
    const time1 = results[dist1.toString()];
    const time2 = results[dist2.toString()];
    
    if (time1 === undefined || time2 === undefined) {
        return null;
    }
    
    return time1 + (targetDist - dist1) * (time2 - time1) / (dist2 - dist1);
}

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
    const { lowerRow, upperRow } = findClosestRows(table20Data, table20Distances[distance], time);
    
    if (!lowerRow && !upperRow) return results;

    const x0 = lowerRow ? parseValue(lowerRow[table20Distances[distance]]) : parseValue(upperRow[table20Distances[distance]]);
    const x1 = upperRow ? parseValue(upperRow[table20Distances[distance]]) : parseValue(lowerRow[table20Distances[distance]]);

    Object.keys(table20Distances).forEach(dist => {
        const column = table20Distances[dist];
        if (lowerRow && upperRow && lowerRow !== upperRow) {
            const y0 = parseValue(lowerRow[column]);
            const y1 = parseValue(upperRow[column]);
            if (y0 !== null && y1 !== null) {
                results[dist] = interpolate(time, x0, x1, y0, y1);
            }
        } else {
            const row = lowerRow || upperRow;
            const value = parseValue(row[column]);
            if (value !== null) {
                results[dist] = value;
            }
        }
    });

    return results;
}

function predictFromTable21(distance, time) {
    const table21Distances = {
        '150': '150m',
        '200': '200m',
        '300': '300m',
        '400': '400m',
        '600': '600m'
    };
    
    const results = {};
    const { lowerRow, upperRow } = findClosestRows(table21Data, table21Distances[distance], time);
    
    if (!lowerRow && !upperRow) return results;

    const x0 = lowerRow ? parseValue(lowerRow[table21Distances[distance]]) : parseValue(upperRow[table21Distances[distance]]);
    const x1 = upperRow ? parseValue(upperRow[table21Distances[distance]]) : parseValue(lowerRow[table21Distances[distance]]);

    Object.keys(table21Distances).forEach(dist => {
        const column = table21Distances[dist];
        if (lowerRow && upperRow && lowerRow !== upperRow) {
            const y0 = parseValue(lowerRow[column]);
            const y1 = parseValue(upperRow[column]);
            if (y0 !== null && y1 !== null) {
                results[dist] = interpolate(time, x0, x1, y0, y1);
            }
        } else {
            const row = lowerRow || upperRow;
            const value = parseValue(row[column]);
            if (value !== null) {
                results[dist] = value;
            }
        }
    });

    return results;
}

loadCSVData();
