const distances = [
    { value: '30-fly', label: '30m Fly' },
    { value: '30-blocks', label: '30m Blocks' },
    { value: 60, label: '60m' },
    { value: 100, label: '100m' },
    { value: 120, label: '120m' },
    { value: 150, label: '150m' },
    { value: 180, label: '180m' },
    { value: 200, label: '200m' },
    { value: 250, label: '250m' },
    { value: 300, label: '300m' },
    { value: 350, label: '350m' },
    { value: 400, label: '400m' },
    { value: 500, label: '500m' },
    { value: 600, label: '600m' }
];

const distanceSelect = document.getElementById('distance-select');
const timeInput = document.getElementById('time-input');
const calculateBtn = document.getElementById('calculate-btn');
const resultsSection = document.getElementById('results-section');
const resultsBody = document.getElementById('results-body');

calculateBtn.addEventListener('click', handleCalculate);

timeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleCalculate();
    }
});

function handleCalculate() {
    // Clear previous error states
    distanceSelect.classList.remove('error');
    timeInput.classList.remove('error');

    const selectedDistance = distanceSelect.value;
    const enteredTime = parseFloat(timeInput.value);

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

    if (typeof predictTimes !== 'function') {
        alert('Data is still loading, please wait a moment and try again');
        return;
    }

    const predictions = predictTimes(selectedDistance, enteredTime);
    
    if (predictions.error) {
        displayError(predictions.error);
        return;
    }

    calculatePredictionsFromInterpolation(predictions, selectedDistance);
}

function calculatePredictionsFromInterpolation(interpolatedTimes, baseDistance) {
    const efforts = [100, 95, 90, 85, 80, 75];
    
    // Generate predictions for all distances
    const predictions = distances.map(dist => {
        const distKey = dist.value.toString();
        const predictedTime100 = interpolatedTimes[distKey];
        
        // Calculate times for different effort levels
        let effortTimes;
        if (predictedTime100 !== undefined && predictedTime100 !== null) {
            effortTimes = efforts.map(effort => {
                return predictedTime100 / (effort / 100);
            });
        } else {
            effortTimes = efforts.map(() => null);
        }
        
        return {
            distance: dist.label,
            distanceValue: dist.value,
            effortTimes: effortTimes,
            isBase: dist.value === baseDistance
        };
    });

    displayResults(predictions);
}

function displayResults(predictions) {
    resultsBody.innerHTML = '';

    predictions.forEach(pred => {
        const row = document.createElement('tr');
        if (pred.isBase) {
            row.classList.add('highlighted');
        }

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

    resultsSection.style.display = 'block';
    
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


function displayError(errorMessage) {
    resultsBody.innerHTML = '';
    
    const errorRow = document.createElement('tr');
    errorRow.innerHTML = `
        <td colspan="7" style="text-align: center; color: #dc3545; font-weight: 600; padding: 20px;">
            ⚠️ ${errorMessage}
        </td>
    `;
    resultsBody.appendChild(errorRow);
    
    resultsSection.style.display = 'block';
    
    setTimeout(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// Validate time input
timeInput.addEventListener('input', (e) => {
    // Allow only numbers and decimal point
    e.target.value = e.target.value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = e.target.value.split('.');
    if (parts.length > 2) {
        e.target.value = parts[0] + '.' + parts.slice(1).join('');
    }
});
