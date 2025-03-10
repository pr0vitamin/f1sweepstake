// Main JavaScript for F1 Sweepstakes

document.addEventListener('DOMContentLoaded', function() {
    // Enable Bootstrap tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
    
    // Enable Bootstrap popovers
    const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
    popoverTriggerList.map(function (popoverTriggerEl) {
        return new bootstrap.Popover(popoverTriggerEl);
    });
    
    // Highlight current page in navbar
    const currentLocation = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentLocation) {
            link.classList.add('active');
        }
    });
    
    // Race results position validation
    const positionInputs = document.querySelectorAll('.position-input');
    if (positionInputs.length > 0) {
        const validatePositions = () => {
            const usedPositions = new Set();
            let isValid = true;
            
            // Clear previous validation
            positionInputs.forEach(input => {
                input.classList.remove('is-invalid');
            });
            
            // Check for duplicates
            positionInputs.forEach(input => {
                if (input.value) {
                    const position = parseInt(input.value);
                    if (usedPositions.has(position)) {
                        input.classList.add('is-invalid');
                        isValid = false;
                    } else {
                        usedPositions.add(position);
                    }
                }
            });
            
            return isValid;
        };
        
        // Add validation to form submission
        const raceResultForm = document.getElementById('raceResultForm');
        if (raceResultForm) {
            raceResultForm.addEventListener('submit', function(event) {
                if (!validatePositions()) {
                    event.preventDefault();
                    alert('Each position can only be assigned to one driver. Please check your entries.');
                }
            });
        }
        
        // Validate on input change
        positionInputs.forEach(input => {
            input.addEventListener('change', validatePositions);
        });
    }
    
    // Driver selection logic
    const userSelect = document.getElementById('user_id');
    const topDriverSelect = document.getElementById('top_driver_id');
    const bottomDriverSelect = document.getElementById('bottom_driver_id');
    
    if (userSelect && topDriverSelect && bottomDriverSelect) {
        // Function to update available drivers
        const updateAvailableDrivers = () => {
            const selectedDrivers = new Set();
            
            // Add currently selected drivers to the set
            if (topDriverSelect.value) selectedDrivers.add(topDriverSelect.value);
            if (bottomDriverSelect.value) selectedDrivers.add(bottomDriverSelect.value);
            
            // Update top drivers options
            Array.from(topDriverSelect.options).forEach(option => {
                if (option.value && option.value !== topDriverSelect.value) {
                    option.disabled = selectedDrivers.has(option.value);
                }
            });
            
            // Update bottom drivers options
            Array.from(bottomDriverSelect.options).forEach(option => {
                if (option.value && option.value !== bottomDriverSelect.value) {
                    option.disabled = selectedDrivers.has(option.value);
                }
            });
        };
        
        // Add event listeners
        topDriverSelect.addEventListener('change', updateAvailableDrivers);
        bottomDriverSelect.addEventListener('change', updateAvailableDrivers);
    }
    
    // Animate leaderboard positions
    const animateLeaderboard = () => {
        const leaderboardRows = document.querySelectorAll('.leaderboard-row');
        leaderboardRows.forEach((row, index) => {
            setTimeout(() => {
                row.classList.add('show');
            }, index * 100);
        });
    };
    
    // If leaderboard is present, animate it
    if (document.querySelector('.leaderboard-row')) {
        animateLeaderboard();
    }
    
    // Add confirmation for race result deletion
    const deleteResultButtons = document.querySelectorAll('.delete-result-btn');
    deleteResultButtons.forEach(button => {
        button.addEventListener('click', function(event) {
            if (!confirm('Are you sure you want to delete these race results? This action cannot be undone.')) {
                event.preventDefault();
            }
        });
    });
    
    // Add date validation for Grand Prix
    const gpDateInput = document.getElementById('gp_date');
    if (gpDateInput) {
        gpDateInput.addEventListener('change', function() {
            const selectedDate = new Date(this.value);
            const today = new Date();
            
            if (selectedDate < today) {
                alert('Warning: You are selecting a date in the past.');
            }
        });
    }
});
