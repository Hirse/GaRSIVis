const express = require('express');
const path = require('path');

const app = express();

// Serve static files in 'dist' as if they were in the root.
app.use(express.static(path.join(__dirname, 'dist')));

// Open the server on port 3000.
app.listen(3000);
