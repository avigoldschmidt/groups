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

    // Flatten all participants and calculate even group sizes
    const allParticipants = participantsByColumn.flat();
    const total = allParticipants.length;
    const baseSize = Math.floor(total / numGroups);
    const remainder = total % numGroups;

    // groupSizes[i] = how many people go in group i
    // First `remainder` groups get one extra person so sizes differ by at most 1
    const groupSizes = Array(numGroups).fill(baseSize);
    for (let i = 0; i < remainder; i++) {
        groupSizes[i]++;
    }

    const runAttempt = () => {
        // Shuffle all participants together as one pool
        const shuffled = [...allParticipants].sort(() => Math.random() - 0.5);

        // Slice into evenly-sized groups
        const groups = [];
        let cursor = 0;
        for (let g = 0; g < numGroups; g++) {
            groups.push(shuffled.slice(cursor, cursor + groupSizes[g]));
            cursor += groupSizes[g];
        }
        return groups;
    };

    // If no restrictions, a single shuffle is sufficient
    if (restrictions.size === 0) {
        return runAttempt();
    }

    // Try multiple attempts to minimise restriction violations
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const groups = runAttempt();

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
            <ul>`;
        
        group.forEach(member => {
            html += `<li>${member}</li>`;
        });
        
        html += '</ul></div>';
    });
    
    html += '<button class="btn btn-primary mt-3" onclick="copyResults()">Copy Results</button></div>';
    
    resultsDiv.innerHTML = html;
}

function copyResults() {
    const groups = document.querySelectorAll('#results > div > div');
    let text = '';
    
    groups.forEach(group => {
        const title = group.querySelector('h4').textContent;
        const members = Array.from(group.querySelectorAll('li')).map(li => li.textContent);
        
        text += `${title}:\n`;
        members.forEach(member => {
            text += `- ${member}\n`;
        });
        text += '\n';
    });
    
    navigator.clipboard.writeText(text).then(() => {
        alert('Results copied to clipboard!');
    }).catch(() => {
        alert('Could not copy to clipboard');
    });
}
