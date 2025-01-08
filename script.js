const db = new GolfDatabase();

let stats = {
    rounds: 0,
    score: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doubles: 0,
    triples: 0,
    penalties: 0
};

let chart = null;
let history = [];

// Add a variable to track which entry is being edited
let editingIndex = null;

// Add these constants at the top of the file
const GOALS = {
    rounds: 30,
    under90: 7,
    under85: 1,
    clean: 10
};

// Load saved stats when the page loads
window.onload = async function() {
    await loadStats();
    updateDisplay();
    createChart();
    updateHistoryDisplay();
};

// Add event listeners to number inputs to clear default value on focus
document.addEventListener('DOMContentLoaded', function() {
    const numberInputs = document.querySelectorAll('input[type="number"]');
    numberInputs.forEach(input => {
        input.addEventListener('focus', function() {
            if (this.value === '0') {
                this.value = '';
            }
        });
        
        input.addEventListener('blur', function() {
            if (this.value === '') {
                this.value = '0';
            }
        });
    });
});

// Load stats from localStorage
async function loadStats() {
    try {
        history = await db.getAllEntries();
        calculateTotals();
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Save stats to localStorage
function saveStats() {
    localStorage.setItem('golfHistory', JSON.stringify(history));
}

// Calculate totals from history
function calculateTotals() {
    // Reset stats
    stats = {
        rounds: 0,
        score: 0,
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doubles: 0,
        triples: 0,
        penalties: 0
    };

    // Sum up all entries
    history.forEach(entry => {
        stats.rounds += entry.rounds;
        stats.score += entry.score;
        stats.birdies += entry.birdies;
        stats.pars += entry.pars;
        stats.bogeys += entry.bogeys;
        stats.doubles += entry.doubles;
        stats.triples += (entry.triples || 0); // Handle older entries that might not have triples
        stats.penalties += entry.penalties;
    });

    updateDisplay();
    updateChart();
    updateGoalsProgress();
}

// Add new stats
async function addStats() {
    const rounds = 1;
    const course = document.getElementById('course').value || 'N/A';
    const fullLength = document.getElementById('fullLength').checked;
    const score = parseInt(document.getElementById('score').value) || 0;
    const birdies = parseInt(document.getElementById('birdies').value) || 0;
    const pars = parseInt(document.getElementById('pars').value) || 0;
    const bogeys = parseInt(document.getElementById('bogeys').value) || 0;
    const doubles = parseInt(document.getElementById('doubles').value) || 0;
    const triples = parseInt(document.getElementById('triples').value) || 0;
    const penalties = parseInt(document.getElementById('penalties').value) || 0;

    const entry = {
        date: new Date().toISOString().split('T')[0],
        rounds,
        course,
        fullLength,
        score,
        birdies,
        pars,
        bogeys,
        doubles,
        triples,
        penalties
    };

    try {
        if (editingIndex !== null) {
            entry.id = history[editingIndex].id; // Preserve the ID for updating
            await db.updateEntry(entry);
            history[editingIndex] = entry;
            editingIndex = null;
            updateEditModeUI();
        } else {
            const id = await db.addEntry(entry);
            entry.id = id;
            history.unshift(entry);
        }

        calculateTotals();
        updateHistoryDisplay();

        // Reset input fields
        document.querySelectorAll('input').forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = true;
            } else {
                input.value = 0;
            }
        });
    } catch (error) {
        console.error('Error saving entry:', error);
        alert('Error saving entry. Please try again.');
    }
}

// Update the display
function updateDisplay() {
    document.getElementById('total-rounds').textContent = stats.rounds;
    document.getElementById('total-score').textContent = stats.score;
    document.getElementById('total-birdies').textContent = stats.birdies;
    document.getElementById('total-pars').textContent = stats.pars;
    document.getElementById('total-bogeys').textContent = stats.bogeys;
    document.getElementById('total-doubles').textContent = stats.doubles;
    document.getElementById('total-triples').textContent = stats.triples;
    document.getElementById('total-penalties').textContent = stats.penalties;
}

// Update history display with editable cells
function updateHistoryDisplay() {
    const tbody = document.getElementById('historyBody');
    tbody.innerHTML = '';
    
    history.forEach((entry, index) => {
        const row = document.createElement('tr');
        const courseDisplay = entry.fullLength === false ? 
            `${entry.course} (Short)` : 
            entry.course;
            
        row.innerHTML = `
            <td>${entry.date}</td>
            <td>${courseDisplay}</td>
            <td>${entry.score}</td>
            <td>${entry.birdies}</td>
            <td>${entry.pars}</td>
            <td>${entry.bogeys}</td>
            <td>${entry.doubles}</td>
            <td>${entry.triples || 0}</td>
            <td>${entry.penalties}</td>
            <td>
                <button onclick="editEntry(${index})" class="icon-btn edit-btn" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteEntry(${index})" class="icon-btn delete-btn" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Update the editEntry function
function editEntry(index) {
    editingIndex = index;
    const entry = history[index];
    
    document.getElementById('course').value = entry.course;
    document.getElementById('fullLength').checked = entry.fullLength ?? true; // Default to true for older entries
    document.getElementById('score').value = entry.score;
    document.getElementById('birdies').value = entry.birdies;
    document.getElementById('pars').value = entry.pars;
    document.getElementById('bogeys').value = entry.bogeys;
    document.getElementById('doubles').value = entry.doubles;
    document.getElementById('triples').value = entry.triples || 0;
    document.getElementById('penalties').value = entry.penalties;
    
    updateEditModeUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete entry
async function deleteEntry(index) {
    if (confirm('Are you sure you want to delete this entry?')) {
        try {
            await db.deleteEntry(history[index].id);
            history.splice(index, 1);
            calculateTotals();
            updateHistoryDisplay();
        } catch (error) {
            console.error('Error deleting entry:', error);
            alert('Error deleting entry. Please try again.');
        }
    }
}

// Create the chart
function createChart() {
    const ctx = document.getElementById('statsChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Birdies', 'Pars', 'Bogeys', 'Doubles', 'Triples+'],
            datasets: [{
                label: 'Shot Distribution',
                data: [
                    stats.birdies,
                    stats.pars,
                    stats.bogeys,
                    stats.doubles,
                    stats.triples
                ],
                backgroundColor: [
                    '#4ade80',  // Soft green for birdies
                    '#60a5fa',  // Soft blue for pars
                    '#fbbf24',  // Soft yellow for bogeys
                    '#f87171',  // Soft red for doubles
                    '#c084fc'   // Soft purple for triples+
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Update the chart
function updateChart() {
    if (chart) {
        chart.data.datasets[0].data = [
            stats.birdies,
            stats.pars,
            stats.bogeys,
            stats.doubles,
            stats.triples
        ];
        chart.update();
    }
}

// Add this function to update the UI for edit mode
function updateEditModeUI() {
    const addButton = document.querySelector('.input-section button');
    if (editingIndex !== null) {
        addButton.textContent = 'Update Entry';
        addButton.classList.add('editing');
    } else {
        addButton.textContent = 'Add Stats';
        addButton.classList.remove('editing');
    }
}

// Add this function to calculate goal progress
function updateGoalsProgress() {
    const currentYear = new Date().getFullYear();
    const thisYearHistory = history.filter(entry => entry.date.startsWith(currentYear));
    
    // Rounds played (all rounds count)
    const roundsPlayed = thisYearHistory.length;
    const roundsProgress = (roundsPlayed / GOALS.rounds) * 100;
    
    // Rounds under 90 and 85 (only full-length courses)
    const under90 = thisYearHistory.filter(entry => 
        entry.fullLength && entry.score < 90
    ).length;
    const under85 = thisYearHistory.filter(entry => 
        entry.fullLength && entry.score < 85
    ).length;
    const under90Progress = (under90 / GOALS.under90) * 100;
    const under85Progress = (under85 / GOALS.under85) * 100;
    
    // Clean rounds (all rounds count)
    const cleanRounds = thisYearHistory.filter(entry => entry.triples === 0).length;
    const cleanProgress = (cleanRounds / GOALS.clean) * 100;
    
    // Update display
    document.getElementById('rounds-progress').textContent = roundsPlayed;
    document.getElementById('rounds-goal').textContent = GOALS.rounds;
    document.getElementById('rounds-bar').style.width = `${Math.min(roundsProgress, 100)}%`;
    
    document.getElementById('under90-progress').textContent = under90;
    document.getElementById('under90-goal').textContent = GOALS.under90;
    document.getElementById('under90-bar').style.width = `${Math.min(under90Progress, 100)}%`;
    
    document.getElementById('under85-progress').textContent = under85;
    document.getElementById('under85-goal').textContent = GOALS.under85;
    document.getElementById('under85-bar').style.width = `${Math.min(under85Progress, 100)}%`;
    
    document.getElementById('clean-progress').textContent = cleanRounds;
    document.getElementById('clean-goal').textContent = GOALS.clean;
    document.getElementById('clean-bar').style.width = `${Math.min(cleanProgress, 100)}%`;
} 