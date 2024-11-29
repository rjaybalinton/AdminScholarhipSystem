// db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       // Replace with your MySQL username
    password: '',       // Replace with your MySQL password
    database: 'scho'
});

// Connect to MySQL
db.connect((err) => {
    if (err) {
        console.error('Cannot connect to database:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

module.exports = db;
