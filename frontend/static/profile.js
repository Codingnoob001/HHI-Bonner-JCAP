// Extract client ID from URL
const params = new URLSearchParams(window.location.search);
const client_id = params.get('id');

if (!client_id) {
    alert('No client ID found in the URL.');
} else {
    fetchClientData(client_id);
    fetchVisits(client_id);
}

// Fetch user data from SQLite backend
async function fetchClientData(client_id) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/patients/${client_id}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include' // Include credentials if required
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch client data. Status: ${response.status}`);
        }

        const clientData = await response.json();

        if (clientData) {
            document.getElementById('clientName').textContent = `${clientData.first_name} ${clientData.last_name}`;
            document.getElementById('clientID').textContent = `ID: ${clientData.client_id || clientData.id}`;

            updateField('firstname', clientData.first_name);
            updateField('lastname', clientData.last_name);
            updateField('dob', clientData.birthdate || 'N/A');
            updateField('age', clientData.age || 'N/A');
            updateField('gender', clientData.gender || 'N/A');
            updateField('race', clientData.race || 'N/A');
            updateField('primaryLanguage', clientData.primary_lang || 'N/A');
            updateField('insurance', clientData.insurance || 'N/A');
            updateField('phone', clientData.phone || 'N/A');
            updateField('zip', clientData.zipcode || 'Unknown');
            updateField('firstVisitDate', clientData.first_visit_date || 'N/A');
        } else {
            alert('Client data not found.');
        }
    } catch (error) {
        console.error('Error fetching client data:', error);
        alert('An error occurred while fetching client data.');
    }
}

// Helper function to update text content
function updateField(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.textContent = value;
    }
}


function showSection(sectionId) {
    // Hide all sections
    document.getElementById('personalInfo').style.display = 'none';
    document.getElementById('visits').style.display = 'none';
    document.getElementById('healthCharts').style.display = 'none';

    // Show the selected section
    document.getElementById(sectionId).style.display = 'block';

    // Store the active tab in sessionStorage
    sessionStorage.setItem('activeTab', sectionId);

    // Remove 'active' class from all sidebar links
    document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.remove('active');
    });

    // Find the correct element and apply 'active' class
    const selectedNavItem = document.querySelector(`.nav-links li[data-section="${sectionId}"]`);
    if (selectedNavItem) {
        selectedNavItem.classList.add('active');
    }
}


document.addEventListener('DOMContentLoaded', function () {
    const currentTab = sessionStorage.getItem('activeTab') || 'personalInfo'; // Get last active tab or default to personalInfo
    showSection(currentTab);
});

// Fetch visits for the client
async function fetchVisits(client_id) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/patients/${client_id}/visits`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include' 
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch visits. Status: ${response.status}`);
        }

        const visits = await response.json();
        const noVisitsMessage = document.getElementById('noVisitsMessage');
        const visitList = document.getElementById('visitList');

        if (!visits || visits.length === 0) {
            noVisitsMessage.style.display = 'block';
            visitList.innerHTML = '';
            return;
        }

        noVisitsMessage.style.display = 'none';
        displayVisits(visits);
    } catch (error) {
        console.error('Error fetching visits:', error);
        alert('An error occurred while fetching visits.');
    }
}

// Display visits dynamically
function displayVisits(visits) {
    const visitList = document.getElementById('visitList');
    visitList.innerHTML = ''; // Clear previous visits

    visits.forEach(visit => {
        const visitItem = document.createElement('div');
        visitItem.classList.add('visit-item');

        visitItem.innerHTML = `
            <span class="visit-date"><strong>Visit Date:</strong> ${visit.visit_date}</span>
            <button class="view-results-btn" onclick="toggleVisitDetails(${visit.id})">View Full Results ▼</button>
        `;

        // Create the visit details section BELOW
        const visitDetails = document.createElement('div');
        visitDetails.id = `visit-details-${visit.id}`;
        visitDetails.classList.add('visit-details');

        visitDetails.innerHTML = `
            <p><span>Systolic:</span> <span>${visit.systolic}</span></p>
            <p><span>Diastolic:</span> <span>${visit.diastolic}</span></p>
            <p><span>Cholesterol:</span> <span>${visit.cholesterol}</span></p>
            <p><span>Glucose:</span> <span>${visit.glucose}</span></p>
            <p><span>Height:</span> <span>${visit.height}</span></p>
            <p><span>Weight:</span> <span>${visit.weight}</span></p>
            <p><span>BMI:</span> <span>${visit.bmi}</span></p>
            <p><span>A1C:</span> <span>${visit.a1c}</span></p>
            <p><span>Follow Up:</span> <span>${visit.follow_up}</span></p>
            <p><span>Event Type:</span> <span>${visit.event_type}</span></p>
            <p><span>Referral Source:</span> <span>${visit.referral_source}</span></p>
            <button onclick="deleteVisit(${visit.id})" class="delete-button">Delete Visit</button>
        `;

        // Append the visit item and the details BELOW it
        visitList.appendChild(visitItem);
        visitList.appendChild(visitDetails);
    });
}

// Toggle visit details (expanding card below)
function toggleVisitDetails(visitId) {
    const detailsDiv = document.getElementById(`visit-details-${visitId}`);
    detailsDiv.style.display = detailsDiv.style.display === 'block' ? 'none' : 'block';
}

// Toggle visit form
function toggleVisitForm() {
    const visitForm = document.getElementById('visitForm');
    visitForm.style.display = visitForm.style.display === 'block' ? 'none' : 'block';
}


// Add a new visit
async function addPatientVisit(client_id) {
    const formData = {
        visit_date: document.getElementById('visitDate').value,
        event_type: document.getElementById('eventType').value,
        referral_source: document.getElementById('referralSource').value,
        follow_up: document.getElementById('followUp').value,
        hra: document.getElementById('hra').value || 0,
        edu: document.getElementById('edu').value || 0,
        case_management: document.getElementById('caseManagement').value || 0,
        systolic: document.getElementById('systolic').value || 0,
        diastolic: document.getElementById('diastolic').value || 0,
        cholesterol: document.getElementById('cholesterol').value || 0,
        fasting: document.getElementById('fasting').value || "No",
        glucose: document.getElementById('glucose').value || 0,
        height: document.getElementById('height').value || 0,
        weight: document.getElementById('weight').value || 0,
        bmi: document.getElementById('bmi').value || 0,
        a1c: document.getElementById('a1c').value || 0,
        acquired_by: document.getElementById('acquiredBy').value || ""
    };

    try {
        const response = await fetch(`http://127.0.0.1:5000/patients/${client_id}/visits`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData),
            credentials: 'include'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Unknown error occurred.');
        }

        showPopup('Visit added successfully!', 'success');

        fetchVisits(client_id);
        sessionStorage.setItem('activeTab', 'visits'); // Ensure we stay on Visits
        showSection('visits'); 

        document.getElementById('visitDate').value = "";
        document.getElementById('eventType').value = "";
        document.getElementById('referralSource').value = "";
        document.getElementById('followUp').value = "";
        document.getElementById('hra').value = "";
        document.getElementById('edu').value = "";
        document.getElementById('caseManagement').value = "";
        document.getElementById('systolic').value = "";
        document.getElementById('diastolic').value = "";
        document.getElementById('cholesterol').value = "";
        document.getElementById('fasting').value = "No";
        document.getElementById('glucose').value = "";
        document.getElementById('height').value = "";
        document.getElementById('weight').value = "";
        document.getElementById('bmi').value = "";
        document.getElementById('a1c').value = "";
        document.getElementById('acquiredBy').value = "";

        document.getElementById('visitForm').style.display = 'none';
        
        document.getElementById('visitForm').style.display = 'none';

    } catch (error) {
        console.error('Error adding visit:', error);
        alert(`An error occurred: ${error.message}`);
    }
}

function showPopup(message, type) {
    const popup = document.createElement('div');
    popup.classList.add('custom-popup', type);
    popup.textContent = message;

    // Ensure popup container exists
    let popupContainer = document.getElementById('popup-container');
    if (!popupContainer) {
        popupContainer = document.createElement('div');
        popupContainer.id = 'popup-container';
        document.body.appendChild(popupContainer);
    }

    popupContainer.appendChild(popup);

    // Fade out and remove after 3 seconds
    setTimeout(() => {
        popup.style.opacity = '0';
        setTimeout(() => popup.remove(), 500);
    }, 6000);
}


// Delete a visit
async function deleteVisit(visit_id) {
    try {
        const response = await fetch(`http://127.0.0.1:5000/patients/${client_id}/visits/${visit_id}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error(`Failed to delete visit. Status: ${response.status}`);
        }

        showPopup('Visit deleted successfully!', 'success');

        fetchVisits(client_id);
    } catch (error) {
        console.error('Error deleting visit:', error);
        showPopup('An error occurred while deleting the visit.', 'error');
    }
}


// Fetch visits when Visits tab is clicked
document.querySelector('.nav-links li[onclick="showSection(\'visits\')"]').addEventListener('click', () => {
    fetchVisits(client_id);
});
