// Firebase Configuration (Replace with actual config later)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
let db;
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} else {
    console.error("Firebase SDK not loaded");
}

document.addEventListener('DOMContentLoaded', async () => {
    const tableBody = document.getElementById('appointments-body');
    const tableEl = document.getElementById('appointments-table');
    const loadingMsg = document.getElementById('loading-msg');

    if (!db) {
        loadingMsg.innerText = "Firebase not initialized. Cannot load appointments.";
        loadingMsg.style.color = "#ef4444";
        return;
    }

    try {
        // Fetch appointments ordered by creation time
        const snapshot = await db.collection("appointments")
            .orderBy("timestamp", "desc")
            .get();

        if (snapshot.empty) {
            loadingMsg.innerText = "No appointments found.";
            return;
        }

        // Hide loading, show table
        loadingMsg.style.display = 'none';
        tableEl.style.display = 'table';

        snapshot.forEach(doc => {
            const data = doc.data();
            const row = document.createElement('tr');
            
            // Format the booking timestamp
            let bookedDate = 'N/A';
            if (data.timestamp) {
                const dateObj = data.timestamp.toDate();
                bookedDate = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }

            row.innerHTML = `
                <td><strong>${data.date || 'N/A'}</strong></td>
                <td><span class="status-badge">${data.time || 'N/A'}</span></td>
                <td>${data.name || 'N/A'}</td>
                <td style="text-transform: capitalize;">${data.service || 'N/A'}</td>
                <td>${data.phone || 'N/A'}</td>
                <td style="font-size: 0.9em; color: #a1a1aa;">${bookedDate}</td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error fetching appointments: ", error);
        loadingMsg.innerText = "Error loading appointments. Check console for details.";
        loadingMsg.style.color = "#ef4444";
    }
});
