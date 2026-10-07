const socket = io();
let map;
let busMarker;
let busLabel;
let isBus = false;
let watchId;
let lastKnownBusLat = null;
let lastKnownBusLng = null;

// Initialize the map
function initMap(lat = 0, lng = 0, zoom = 2) {
    if (!map) {
        map = L.map('map').setView([lat, lng], zoom);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
    } else {
        map.setView([lat, lng], zoom);
    }
}

// Custom Bus Icon
const busIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});

// Initial empty map
initMap(20, 0, 2);

const roleSelection = document.getElementById('role-selection');
const statusDiv = document.getElementById('status');
const pinSection = document.getElementById('pin-section');
const pinInput = document.getElementById('pin-input');
const recenterBtn = document.getElementById('btn-recenter');

// Default PIN for the bus
const BUS_PIN = "1504";

document.getElementById('btn-bus').addEventListener('click', () => {
    roleSelection.classList.add('hidden');
    pinSection.classList.remove('hidden');
    pinInput.value = '';
    pinInput.focus();
    statusDiv.textContent = '';
});

document.getElementById('btn-cancel-pin').addEventListener('click', () => {
    pinSection.classList.add('hidden');
    roleSelection.classList.remove('hidden');
    statusDiv.textContent = '';
});

document.getElementById('btn-submit-pin').addEventListener('click', () => {
    if (pinInput.value === BUS_PIN) {
        isBus = true;
        pinSection.classList.add('hidden');
        statusDiv.textContent = 'Starting GPS tracking...';
        statusDiv.style.color = '#333';
        startTracking();
    } else {
        statusDiv.textContent = 'Incorrect PIN!';
        statusDiv.style.color = '#d9534f';
    }
});

document.getElementById('btn-passenger').addEventListener('click', () => {
    isBus = false;
    roleSelection.classList.add('hidden');
    statusDiv.textContent = 'Waiting for bus location...';
    statusDiv.style.color = '#333';
    recenterBtn.classList.remove('hidden');
    
    // Attempt to center map on user's current location initially
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            if(!busMarker) {
                initMap(position.coords.latitude, position.coords.longitude, 13);
            }
        });
    }
});

// Recenter button click
recenterBtn.addEventListener('click', () => {
    if (lastKnownBusLat !== null && lastKnownBusLng !== null) {
        map.setView([lastKnownBusLat, lastKnownBusLng], 16);
    } else {
        statusDiv.textContent = 'Bus location not available yet.';
        statusDiv.style.color = '#d9534f';
    }
});

function startTracking() {
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                statusDiv.textContent = 'Broadcasting location (Live)';
                statusDiv.style.color = '#28a745';
                
                // Update local map
                updateBusLocation(lat, lng, true);
                
                // Send to server
                socket.emit('busLocationUpdate', { lat, lng });
            },
            (error) => {
                console.error(error);
                statusDiv.textContent = 'Error getting location. Please enable GPS permissions.';
                statusDiv.style.color = '#d9534f';
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
    } else {
        statusDiv.textContent = 'Geolocation is not supported by this browser.';
    }
}

function updateBusLocation(lat, lng, centerMap) {
    lastKnownBusLat = lat;
    lastKnownBusLng = lng;

    if (!busMarker) {
        busMarker = L.marker([lat, lng], { icon: busIcon }).addTo(map);
        
        // Add "ASM BUS" label next to the bus icon
        busLabel = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'bus-label',
                html: 'ASM BUS',
                iconSize: [70, 20],
                iconAnchor: [-5, 10]
            })
        }).addTo(map);

        if(centerMap) {
            initMap(lat, lng, 16);
        }
    } else {
        busMarker.setLatLng([lat, lng]);
        busLabel.setLatLng([lat, lng]);
        // Only auto-center for the bus driver, not the passenger
        if(centerMap && isBus) {
            map.setView([lat, lng]);
        }
    }
}

socket.on('busLocationUpdate', (data) => {
    if (!isBus) {
        statusDiv.textContent = 'Bus location updated (Live)';
        statusDiv.style.color = '#28a745';
        updateBusLocation(data.lat, data.lng, !busMarker); // Center only if first time we see the bus
    }
});
