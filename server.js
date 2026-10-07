const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

let lastBusLocation = null;

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Immediately send the last known location if available
    if (lastBusLocation) {
        socket.emit('busLocationUpdate', lastBusLocation);
    }

    // Listen for location updates from the bus
    socket.on('busLocationUpdate', (data) => {
        lastBusLocation = data; // Save the latest location
        // Broadcast the location to all other connected clients
        socket.broadcast.emit('busLocationUpdate', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
