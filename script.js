// Global variables
let csvData = null;
let participantsByColumn = [];
let restrictions = new Set();

// DOM elements
let fileInput, generateBtn, resultsDiv;

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    fileInput = document.getElementById('fileInput');
    generateBtn = document.getElementById('generateBtn');
    resultsDiv = document.getElementById('results');
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
});

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        csvData = e.target.result;
        parseCSV(csvData);
        generateBtn.disabled = false;
    };
    reader.readAsText(file);
}

function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const rows = lines.map(line => parseCSVLine(line));
    
    participantsByColumn = [];
    restrictions = new Set();
    
    if (rows.length === 0) return;
    
    // Find participant columns and restriction start
    const headerRow = rows[0];
    const participantColumns = [];
    let restrictionStart = headerRow.length;
    
    for (let i = 0; i < headerRow.length; i++) {
        const cell = headerRow[i].trim();
        if (cell) {
            participantColumns.push(i);
        } else if (participantColumns.length > 0) {
            restrictionStart = i + 1;
            break;
        }
    }
    
    if (restrictionStart === headerRow.length) {
        participantColumns = Array.from({length: headerRow.length}, (_, i) => i);
        restrictionStart = headerRow.length;
    }
    
    // Initialize participant arrays
    participantsByColumn = participantColumns.map(() => []);
    
    // Extract participants
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        participantColumns.forEach((colIdx, i) => {
            if (colIdx < row.length && row[colIdx].trim()) {
                participantsByColumn[i].push(row[colIdx].trim());
            }
        });
    }
    
    // Extract restrictions
    for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        if (row.length > restrictionStart) {
            const rowRestrictions = row.slice(restrictionStart)
                .map(cell => cell.trim())
                .filter(cell => cell);
            
            if (rowRestrictions.length > 1) {
                for (let i = 0; i < rowRestrictions.length; i++) {
                    for (let j = i + 1; j < rowRestrictions.length; j++) {
                        const pair = [rowRestrictions[i], rowRestrictions[j]].sort();
                        restrictions.add(pair.join('|'));
                    }
                }
            }
        }
    }
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current);
    return result;
}

function generateGroups() {
    const numGroups = parseInt(document.getElementById('numGroups').value);
    
    if (!numGroups || numGroups <= 0) {
        alert('Please enter a valid number of groups');
        return;
    }
    
    const allParticipants = participantsByColumn.flat();
    
    if (numGroups > allParticipants.length) {
        alert(`Cannot create ${numGroups} groups with only ${allParticipants.length} participants!`);
        return;
    }
    
    const groups = createRandomGroups(participantsByColumn, numGroups, restrictions);
    displayGroups(groups);
}

function createRandomGroups(participantsByColumn, numGroups, restrictions, maxAttempts = 5000) {
    let bestGroups = null;
    let bestViolations = Infinity;
    
    // Calculate distributions
    const columnDistributions = participantsByColumn.map(column => {
        const columnSize = column.length;
        const basePerGroup = Math.floor(columnSize / numGroups);
        const remainder = columnSize % numGroups;
        
        const distribution = Array(numGroups).fill(basePerGroup);
        for (let i = 0; i < remainder; i++) {
            distribution[i]++;
        }
        
        return distribution;
    });
    
    // If no restrictions, return simple proportional groups
    if (restrictions.size === 0) {
        const shuffledColumns = participantsByColumn.map(column => 
            [...column].sort(() => Math.random() - 0.5)
        );
        
        const groups = Array(numGroups).fill(null).map(() => []);
        
        shuffledColumns.forEach((shuffledColumn, columnIdx) => {
            let startIdx = 0;
            for (let groupIdx = 0; groupIdx < numGroups; groupIdx++) {
                const count = columnDistributions[columnIdx][groupIdx];
                const endIdx = startIdx + count;
                groups[groupIdx].push(...shuffledColumn.slice(startIdx, endIdx));
                startIdx = endIdx;
            }
        });
        
        return groups;
    }
    
    // Try multiple attempts to minimize violations
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const shuffledColumns = participantsByColumn.map(column => 
            [...column].sort(() => Math.random() - 0.5)
        );
        
        const groups = Array(numGroups).fill(null).map(() => []);
        
        shuffledColumns.forEach((shuffledColumn, columnIdx) => {
            let startIdx = 0;
            for (let groupIdx = 0; groupIdx < numGroups; groupIdx++) {
                const count = columnDistributions[columnIdx][groupIdx];
                const endIdx = startIdx + count;
                groups[groupIdx].push(...shuffledColumn.slice(startIdx, endIdx));
                startIdx = endIdx;
            }
        });
        
        // Count violations
        let totalViolations = 0;
        groups.forEach(group => {
            totalViolations += countViolations(group, restrictions);
        });
        
        if (totalViolations === 0) {
            return groups;
        }
        
        if (totalViolations < bestViolations) {
            bestViolations = totalViolations;
            bestGroups = groups.map(group => [...group]);
        }
    }
    
    return bestGroups;
}

function countViolations(group, restrictions) {
    let violations = 0;
    for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
            const pair = [group[i], group[j]].sort().join('|');
            if (restrictions.has(pair)) {
                violations++;
            }
        }
    }
    return violations;
}

function displayGroups(groups) {
    let html = '<div class="mt-4"><h2>Generated Groups</h2>';
    
    groups.forEach((group, index) => {
        html += `<div class="mb-3">
            <h4>Group ${index + 1}</h4>
            <p>${group.join(', ')}</p>
        </div>`;
    });
    
    html += '<button class="btn btn-primary mt-3" onclick="copyResults()">Copy Results</button></div>';
    
    resultsDiv.innerHTML = html;
}

function copyResults() {
    const groups = document.querySelectorAll('#results > div > div');
    let text = '';
    
    groups.forEach(group => {
        const title = group.querySelector('h4').textContent;
        const members = group.querySelector('p').textContent;
        text += `${title}: ${members}\n`;
    });
    
    navigator.clipboard.writeText(text).then(() => {
        alert('Results copied to clipboard!');
    }).catch(() => {
        alert('Could not copy to clipboard');
    });
}
