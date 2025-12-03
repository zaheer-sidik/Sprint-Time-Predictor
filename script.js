// Distance options in meters
const distances = [
    { value: '30-fly', label: '30m Fly' },
    { value: '30-blocks', label: '30m Blocks' },
    { value: 60, label: '60m' },
    { value: 100, label: '100m' },
    { value: 120, label: '120m' },  // Interpolated for display
    { value: 150, label: '150m' },
    { value: 180, label: '180m' },  // Interpolated for display
    { value: 200, label: '200m' },
    { value: 250, label: '250m' },
    { value: 300, label: '300m' },
    { value: 350, label: '350m' },  // Interpolated for display
    { value: 400, label: '400m' },
    { value: 500, label: '500m' },  // Interpolated for display
    { value: 600, label: '600m' }
];

// Get DOM elements
const distanceSelect = document.getElementById('distance-select');
const timeInput = document.getElementById('time-input');
const calculateBtn = document.getElementById('calculate-btn');
const resultsSection = document.getElementById('results-section');
const resultsBody = document.getElementById('results-body');

// Event listener for calculate button
calculateBtn.addEventListener('click', handleCalculate);

// Allow Enter key to trigger calculation
timeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleCalculate();
    }
});

function handleCalculate() {
    // Clear previous error states
    distanceSelect.classList.remove('error');
    timeInput.classList.remove('error');

    // Get values
    const selectedDistance = distanceSelect.value;
    const enteredTime = parseFloat(timeInput.value);

    // Validation
    if (!selectedDistance) {
        alert('Please select a distance');
        distanceSelect.classList.add('error');
        return;
    }

    if (!enteredTime || enteredTime <= 0) {
        alert('Please enter a valid time in seconds');
        timeInput.classList.add('error');
        return;
    }

    // Check if CSV data is loaded
    if (typeof predictTimes !== 'function') {
        alert('Data is still loading, please wait a moment and try again');
        return;
    }

    // Use interpolation from CSV data
    const predictions = predictTimes(selectedDistance, enteredTime);
    
    if (predictions.error) {
        displayError(predictions.error);
        return;
    }

    // Calculate and display results
    calculatePredictionsFromInterpolation(predictions, selectedDistance);
}

function calculatePredictionsFromInterpolation(interpolatedTimes, baseDistance) {
    // Effort percentages
    const efforts = [100, 95, 90, 85, 80, 75];
    
    // Generate predictions for all distances
    const predictions = distances.map(dist => {
        // Get the 100% effort time from interpolation
        const distKey = dist.value.toString();
        const predictedTime100 = interpolatedTimes[distKey];
        
        // Calculate times for different effort levels
        let effortTimes;
        if (predictedTime100 !== undefined && predictedTime100 !== null) {
            effortTimes = efforts.map(effort => {
                return predictedTime100 / (effort / 100);
            });
        } else {
            // If no prediction available, use null values
            effortTimes = efforts.map(() => null);
        }
        
        return {
            distance: dist.label,
            distanceValue: dist.value,
            effortTimes: effortTimes,
            isBase: dist.value === baseDistance
        };
    });

    // Display results
    displayResults(predictions);
}

function displayResults(predictions) {
    // Clear previous results
    resultsBody.innerHTML = '';

    // Populate table
    predictions.forEach(pred => {
        const row = document.createElement('tr');
        if (pred.isBase) {
            row.classList.add('highlighted');
        }

        // Create cells for distance and all effort percentages
        const cells = pred.effortTimes.map(time => {
            if (time === null || time === undefined) {
                return '<td>-</td>';
            }
            return `<td>${formatTime(time)}</td>`;
        }).join('');
        
        row.innerHTML = `
            <td>${pred.distance}</td>
            ${cells}
        `;

        resultsBody.appendChild(row);
    });

    // Show results section with animation
    resultsSection.style.display = 'block';
    
    // Smooth scroll to results
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds.toFixed(2)}s`;
    } else if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(2);
        return `${mins}:${secs.padStart(5, '0')}`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = (seconds % 60).toFixed(2);
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
    }
}

// Display error message on the website
function displayError(errorMessage) {
    // Clear previous results
    resultsBody.innerHTML = '';
    
    // Create error row
    const errorRow = document.createElement('tr');
    errorRow.innerHTML = `
        <td colspan="7" style="text-align: center; color: #dc3545; font-weight: 600; padding: 20px;">
            ⚠️ ${errorMessage}
        </td>
    `;
    resultsBody.appendChild(errorRow);
    
    // Show results section with error
    resultsSection.style.display = 'block';
    
    // Scroll to error
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// Add input validation on the fly
timeInput.addEventListener('input', (e) => {
    // Allow only numbers and decimal point
    e.target.value = e.target.value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = e.target.value.split('.');
    if (parts.length > 2) {
        e.target.value = parts[0] + '.' + parts.slice(1).join('');
    }
});
