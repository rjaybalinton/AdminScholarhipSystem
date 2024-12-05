const bodyParser = require('body-parser');
const express = require('express');
const mysql = require('mysql2');
const routes = require('./routes/router'); // Import routes from router.js
const path = require('path'); // Import path module
const cors = require('cors');//const cors = require('cors');
const fs = require('fs'); // Import fs module

const app = express();
// Ensure the "exports" directory exists
const exportsDir = path.join(__dirname, 'exports'); // Adjusted to current directory structure
if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir); // Create the directory if it doesn't exist
    console.log(`Created directory: ${exportsDir}`);
}

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware configuration
app.use(
    cors({
      origin: "http://localhost:8080 ",
      credentials: true,
    })
  );
  
app.use('/', routes);

app.listen(7200, () => {
    console.log('server running on http://localhost:7200');
});
