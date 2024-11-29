const db = require('../config/db');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const adminModel = {
    addPost: (title, content, userId) => {
        const sql = `INSERT INTO posts (title, content, created_at, user_id) VALUES (?, ?, NOW(), ?)`;
        return new Promise((resolve, reject) => {
            db.query(sql, [title, content, userId], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    getPosts: () => {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM posts ORDER BY created_at DESC', (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    getApplicationData: () => {
        const sql = `
            SELECT s.student_id, s.student_number, s.first_name, s.last_name, s.middle_initial, s.degree_program, 
                   s.year_level, s.gmail, s.phone_number, s.status_enrollment, s.zip_code, s.enrolled_units, 
                   a.status AS application_status
            FROM students s
            LEFT JOIN application_status a ON s.student_id = a.student_id
            WHERE (a.status IS NULL OR a.status NOT IN ('confirmed', 'rejected'))
        `;
        return new Promise((resolve, reject) => {
            db.query(sql, (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    searchStudents: (searchQuery) => {
        const sql = `
            SELECT * FROM students s
            LEFT JOIN application_status a ON s.student_id = a.student_id
            WHERE (s.student_id = ? OR s.student_number = ?)
            AND (a.status IS NULL OR a.status NOT IN ('confirmed', 'rejected'))
        `;
        return new Promise((resolve, reject) => {
            db.query(sql, [searchQuery, searchQuery], (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    addStudent: (studentData) => {
        const sql = `
            INSERT INTO students (student_id, first_name, last_name, middle_initial, degree_program, year_level, gmail, 
                                  phone_number, status_enrollment, zip_code, enrolled_units) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        return new Promise((resolve, reject) => {
            db.query(sql, Object.values(studentData), (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    getStatus: (studentId, callback) => {
        const query = `SELECT status FROM application_status WHERE student_id = ?`;
        db.query(query, [studentId], callback);
    },

    insertStatus: (studentId, callback) => {
        const query = `INSERT INTO application_status (student_id, status) VALUES (?, 'pending')`;
        db.query(query, [studentId], callback);
    },

    updateStatus: (studentId, callback) => {
        const query = `
            UPDATE application_status 
            SET status = 'confirmed', updated_at = NOW() 
            WHERE student_id = ?
        `;
        db.query(query, [studentId], callback);
    },

    updateStatusToRejected: (studentId, callback) => {
        const query = `
            UPDATE application_status 
            SET status = 'rejected', updated_at = NOW() 
            WHERE student_id = ?
        `;
        db.query(query, [studentId], callback);
    },

    getConfirmedStudents: () => {
        const query = `
            SELECT s.student_id, s.student_number, s.first_name, s.last_name, s.middle_initial, 
                   s.degree_program, s.year_level, s.gmail, s.phone_number, s.zip_code, 
                   s.enrolled_units, a.updated_at
            FROM students s
            INNER JOIN application_status a ON s.student_id = a.student_id
            WHERE a.status = 'confirmed'
            ORDER BY a.updated_at DESC
        `;
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    getRejectedStudents: () => {
        const query = `
            SELECT s.student_id, s.student_number, s.first_name, s.last_name, s.middle_initial, 
                   s.degree_program, s.year_level, s.gmail, s.phone_number, s.zip_code, 
                   s.enrolled_units, a.updated_at
            FROM students s
            INNER JOIN application_status a ON s.student_id = a.student_id
            WHERE a.status = 'rejected'
            ORDER BY a.updated_at DESC
        `;
        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) reject(err);
                resolve(results);
            });
        });
    },

    exportConfirmedStudents: () => {
        const query = `
            SELECT s.student_id, s.student_number, s.first_name, s.last_name, s.degree_program, 
                   s.year_level, s.gmail, s.phone_number, s.zip_code, s.enrolled_units, a.updated_at
            FROM students s
            INNER JOIN application_status a ON s.student_id = a.student_id
            WHERE a.status = 'confirmed'
            ORDER BY a.updated_at DESC
        `;

        return new Promise((resolve, reject) => {
            db.query(query, (err, results) => {
                if (err) reject(err);

                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('Confirmed Students');

                // Add headers
                worksheet.columns = [
                    { header: 'Student ID', key: 'student_id', width: 15 },
                    { header: 'Student Number', key: 'student_number', width: 20 },
                    { header: 'First Name', key: 'first_name', width: 20 },
                    { header: 'Last Name', key: 'last_name', width: 20 },
                    { header: 'Degree Program', key: 'degree_program', width: 30 },
                    { header: 'Year Level', key: 'year_level', width: 10 },
                    { header: 'Gmail', key: 'gmail', width: 25 },
                    { header: 'Phone Number', key: 'phone_number', width: 15 },
                    { header: 'Zip Code', key: 'zip_code', width: 10 },
                    { header: 'Enrolled Units', key: 'enrolled_units', width: 15 },
                    { header: 'Updated At', key: 'updated_at', width: 20 },
                ];

                // Add rows
                worksheet.addRows(results);

                const exportsDir = path.join(__dirname, '../exports');
                if (!fs.existsSync(exportsDir)) {
                    fs.mkdirSync(exportsDir);
                }

                const filePath = path.join(exportsDir, 'confirmed_students.xlsx');

                workbook.xlsx.writeFile(filePath)
                    .then(() => resolve(filePath))
                    .catch(reject);
            });
        });
    },

    getYearLevelData: (callback) => {
        const query = `
            SELECT s.year_level, COUNT(*) AS count
            FROM students s
            INNER JOIN application_status a ON s.student_id = a.student_id
            WHERE a.status = 'confirmed'
            GROUP BY s.year_level
        `;
        db.query(query, callback);
    },fetchAcceptanceRate: () => {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT DATE_FORMAT(updated_at, '%Y-%m') AS date, 
                       SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
                       SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS rejected
                FROM application_status
                WHERE status IN ('confirmed', 'rejected')
                GROUP BY DATE_FORMAT(updated_at, '%Y-%m')
                ORDER BY DATE_FORMAT(updated_at, '%Y-%m');
            `;
            db.query(query, (err, results) => {
                if (err) {
                    return reject(err);
                }
                resolve(results);
            });
        });
    },
    

    getDegreeProgramData: (callback) => {
        const query = `
            SELECT s.degree_program, COUNT(*) AS count
            FROM students s
            INNER JOIN application_status a ON s.student_id = a.student_id
            WHERE a.status = 'confirmed'
            GROUP BY s.degree_program
        `;
        db.query(query, callback);
    },
    


};

module.exports = adminModel;
