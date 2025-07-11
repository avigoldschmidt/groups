// Global variables
let csvData = null;
let participantsByColumn = [];
let restrictions = new Set();

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const generateBtn = document.getElementById('generateBtn');
const resultsDiv = document.getElementById('results');

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

function setupEventListeners() {
    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'text/csv') {
            handleFile(files[0]);
        }
    });

    // Click on upload area (but not on button)
    uploadArea.addEventListener('click', (e) => {
        // Don't trigger if clicking on the button
        if (e.target.tagName !== 'BUTTON') {
            fileInput.click();
        }
    });

    // Button click
    const chooseFileBtn = document.getElementById('chooseFileBtn');
    if (chooseFileBtn) {
        chooseFileBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            fileInput.click();
        });
    }

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        csvData = e.target.result;
        parseCSV(csvData);
        generateBtn.disabled = false;
        
        // Update upload area to show file loaded
        uploadArea.innerHTML = `
            <div class="text-success">
                <strong>${file.name}</strong> loaded successfully!
            </div>
            <button class="btn btn-outline-primary mt-2" type="button" onclick="document.getElementById('fileInput').click()">
                Choose Different File
            </button>
        `;
        
        showMessage(`CSV file "${file.name}" loaded successfully!`, 'success');
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
        showMessage('Please enter a valid number of groups', 'danger');
        return;
    }
    
    const allParticipants = participantsByColumn.flat();
    
    if (numGroups > allParticipants.length) {
        showMessage(`Cannot create ${numGroups} groups with only ${allParticipants.length} participants!`, 'danger');
        return;
    }
    
    // Show loading state
    generateBtn.innerHTML = 'Generating...';
    generateBtn.disabled = true;
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
        const groups = createRandomGroups(participantsByColumn, numGroups, restrictions);
        displayGroups(groups);
        
        // Reset button
        generateBtn.innerHTML = 'Generate Groups';
        generateBtn.disabled = false;
        
        // Scroll to results
        document.getElementById('results').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
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
    let html = '<div class="mt-4"><h2>Generated Groups</h2><div class="row">';
    
    groups.forEach((group, index) => {
        html += `<div class="col-md-6 col-lg-4 mb-3">
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">Group ${index + 1}</h5>
                </div>
                <div class="card-body">`;
        
        group.forEach(member => {
            html += `<div class="badge bg-primary me-1 mb-1">${member}</div>`;
        });
        
        html += '</div></div></div>';
    });
    
    html += '</div><button class="btn btn-outline-success mt-3" onclick="copyResults()">Copy Results</button></div>';
    
    resultsDiv.innerHTML = html;
}

function copyResults() {
    const cards = document.querySelectorAll('.card');
    let text = '';
    
    cards.forEach(card => {
        const title = card.querySelector('.card-title').textContent;
        const members = Array.from(card.querySelectorAll('.badge'))
            .map(badge => badge.textContent);
        
        text += `${title}:\n`;
        members.forEach(member => {
            text += `${member}\n`;
        });
        text += '\n';
    });
    
    navigator.clipboard.writeText(text).then(() => {
        showMessage('Results copied to clipboard!', 'success');
    }).catch(() => {
        showMessage('Could not copy to clipboard', 'danger');
    });
}

function showMessage(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    resultsDiv.insertBefore(alertDiv, resultsDiv.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}
