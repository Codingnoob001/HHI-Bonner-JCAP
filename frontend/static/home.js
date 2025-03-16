// Scroll to Add Client Section
function scrollToAddClient() {
    let formSection = document.getElementById("add-client-form");
    if (formSection) {
        formSection.scrollIntoView({ behavior: "smooth" });
    }
}

document.getElementById('clientForm').addEventListener('submit', async function(e) {
    e.preventDefault(); // Prevent default form submission behavior

    // Capture form data with correct field names
    const formData = {
        first_name: document.getElementById('firstName').value, // ✅ Backend expects first_name
        last_name: document.getElementById('lastName').value,   // ✅ Backend expects last_name
        age: document.getElementById('age').value,
        birthdate: document.getElementById('dob').value,        // ✅ Backend expects birthdate
        first_visit_date: document.getElementById('firstVisitDate').value, // ✅ Backend expects first_visit_date
        gender: document.getElementById('gender').value,
        race: document.getElementById('race').value,
        primary_lang: document.getElementById('primaryLanguage').value, // ✅ Backend expects primary_lang
        phone: document.getElementById('phone').value,
        zipcode: document.getElementById('zip').value,          // ✅ Backend expects zipcode
        insurance: document.getElementById('insurance').value,
    };

    console.log('Form Data:', formData); // Debug log

    if (!formData.first_name || !formData.last_name || !formData.age || !formData.birthdate || !formData.first_visit_date) {
        alert('Please fill in all required fields!');
        return;
    }

    const dateRegex = /^(0[1-9]|1[0-2])\/([0-2][0-9]|3[01])\/\d{4}$/;

    // Validate the dates
    if (!dateRegex.test(formData.birthdate)) {
        alert('Please enter a valid birthdate in MM/DD/YYYY format');
        return;
    }

    if (!dateRegex.test(formData.first_visit_date)) {
        alert('Please enter a valid first visit date in MM/DD/YYYY format');
        return;
    }

    try {
        // Send form data to the backend to add a new client
        const response = await fetch('http://127.0.0.1:5000/patients', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(formData),
            credentials: 'include' // Include credentials if needed
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const result = await response.json();

        console.log('Full Response:', result); // Debug log
        console.log('Client added successfully:', result);

        // Check if result.client_id is available
        if (result && result.client_id) {
            console.log('Redirecting to profile page');
            window.location.href = `profile.html?id=${result.client_id}`; // ✅ Use correct key from backend
        } else {
            console.error('No client ID returned from the backend.');
            alert('Client created, but unable to retrieve the profile ID.');
        }

    } catch (error) {
        console.error('Error:', error);
        alert('A server error occurred. Please try again.');
    }
});
