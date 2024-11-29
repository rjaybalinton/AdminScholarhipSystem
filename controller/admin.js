const adminModel = require('../models/adminmodel');

const adminController = {
    addPost: (req, res) => {
        const { title, content } = req.body;
        const userId = req.user?.id || 1;

        if (!title || !content) {
            return res.status(400).send('Title and content are required');
        }

        adminModel.addPost(title, content, userId)
            .then(() => res.redirect('/'))
            .catch(err => {
                console.error('Database Error:', err);
                res.status(500).send('Internal Server Error: ${err.message}');
            });
    },

    home: (req, res) => {
        adminModel.getPosts()
            .then(posts => res.render('home', { posts }))
            .catch(() => res.status(500).send('Database error'));
    },

    application: (req, res) => {
        adminModel.getApplicationData()
            .then(students => res.render('application', { students }))
            .catch(() => res.status(500).send('Database error'));
    },

    search: (req, res) => {
        const searchQuery = req.query.search;
        adminModel.searchStudents(searchQuery)
            .then(students => res.render('application', { students }))
            .catch(() => res.status(500).send('Database error'));
    },

    addStudent: (req, res) => {
        const newStudent = req.body;
        adminModel.addStudent(newStudent)
            .then(() => res.redirect('/application'))
            .catch(err => {
                console.error('Error adding student:', err);
                res.status(500).send('Error adding student: ${err.message}');
            });
    },

    getConfirmedStudents: (req, res) => {
        adminModel.getConfirmedStudents()
            .then(students => res.render('confirmed', { students }))
            .catch(() => res.status(500).send('Error retrieving confirmed students.'));
    },

    getRejectedStudents: (req, res) => {
        adminModel.getRejectedStudents()
            .then(students => res.render('rejected', { students }))
            .catch(() => res.status(500).send('Error retrieving rejected students.'));
    },

    exportConfirmedStudents: (req, res) => {
        adminModel.exportConfirmedStudents()
        .then(filePath => {
            res.download(filePath, 'confirmed_students.xlsx', (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                    res.status(500).send('Error exporting file.');
                }
            });
        })
        .catch(() => {
            res.status(500).send('Error exporting file.');
        });
    },
    renderVisualizationPage: (req, res) => {
        adminModel.getYearLevelData((err, yearResults) => {
            if (err) {
                console.error('Error fetching year level data:', err);
                return res.status(500).send('Database error');
            }

            adminModel.getDegreeProgramData((err, degreeResults) => {
                if (err) {
                    console.error('Error fetching degree program data:', err);
                    return res.status(500).send('Database error');
                }

                const totalStudents = yearResults.reduce((sum, result) => sum + result.count, 0);

                if (totalStudents === 0) {
                    console.warn('No confirmed students found in the database');
                    return res.render('visualization', {
                        title: 'Data Visualization',
                        yearLevelLabels: [],
                        yearLevelData: [],
                        degreeProgramLabels: [],
                        degreeProgramData: [],
                    });
                }

                // Process data for visualization
                const yearLevelLabels = yearResults.map(result => `${result.year_level} Year `);
                const yearLevelData = yearResults.map(result => (result.count / totalStudents) * 100);

                const degreeProgramLabels = degreeResults.map(result => result.degree_program);
                const degreeProgramData = degreeResults.map(result => (result.count / totalStudents) * 100);

                res.render('visualization', {
                    title: 'Data Visualization (Confirmed Students)',
                    yearLevelLabels,
                    yearLevelData,
                    degreeProgramLabels,
                    degreeProgramData,
                });
            });
        });
    },renderAcceptanceVisualization: (req, res) => {
        adminModel.getAcceptanceRateByDate((err, results) => {
            if (err) {
                console.error('Error fetching acceptance rate data:', err);
                return res.status(500).send('Database error');
            }
    
            // Ensure `results` contains data
            if (!results || results.length === 0) {
                console.warn('No data available for acceptance rate visualization');
                return res.render('acceptanceVisualization', {
                    title: 'Acceptance Rate Visualization',
                    dateLabels: [],
                    acceptanceRates: [],
                });
            }
    
            // Process the results
            const dateLabels = results.map(result => result.date);
            const acceptanceRates = results.map(result => result.acceptance_rate);
    
            // Pass data to the view
            res.render('acceptanceVisualization', {
                title: 'Acceptance Rate Visualization',
                dateLabels,
                acceptanceRates,
            });
        });
    },getAcceptanceRateData: async (req, res) => {
        try {
            const results = await adminModel.fetchAcceptanceRate();
            res.json(results);
        } catch (error) {
            console.error('Error fetching acceptance rate data:', error);
            res.status(500).send('Error fetching data');
        }
    },
    
    confirmStudent: (req, res) => {
        const studentId = req.params.studentId; // Get studentId from route parameters

        // Step 1: Check the student's current status
        adminModel.getStatus(studentId, (err, results) => {
            if (err) {
                console.error('Error retrieving student status:', err);
                return res.status(500).json({ success: false, message: 'Error retrieving student status.' });
            }

            // Step 2: If no status exists, insert a new status as 'pending'
            if (results.length === 0) {
                adminModel.insertStatus(studentId, (insertErr) => {
                    if (insertErr) {
                        console.error('Error inserting application status:', insertErr);
                        return res.status(500).json({ success: false, message: 'Error inserting application status.' });
                    }

                    // Step 3: Update the status to 'confirmed'
                    adminModel.updateStatus(studentId, (updateErr) => {
                        if (updateErr) {
                            console.error('Error updating status to confirmed:', updateErr);
                            return res.status(500).json({ success: false, message: 'Error confirming student.' });
                        }

                        return res.json({
                            success: true,
                            message: 'Student application confirmed successfully!',
                        });
                    });
                });
                return; // Prevent further execution
            }

            // Step 4: If status exists, check if it's already confirmed
            const currentStatus = results[0].status;
            if (currentStatus === 'confirmed') {
                return res.json({
                    success: false,
                    message: 'Student application is already confirmed.',
                });
            }

            // Step 5: Update the status to 'confirmed'
            adminModel.updateStatus(studentId, (updateErr) => {
                if (updateErr) {
                    console.error('Error updating status to confirmed:', updateErr);
                    return res.status(500).json({ success: false, message: 'Error confirming student.' });
                }

                return res.json({
                    success: true,
                    message: 'Student application confirmed successfully!',
                });
            });
        });
    },
    rejectStudent: (req, res) => {
        const studentId = req.params.studentId; // Get studentId from route parameters

        // Step 1: Check the student's current status
        adminModel.getStatus(studentId, (err, results) => {
            if (err) {
                console.error('Error retrieving student status:', err);
                return res.status(500).json({ success: false, message: 'Error retrieving student status.' });
            }

            // Step 2: If no status exists, insert a new status as 'pending'
            if (results.length === 0) {
                adminModel.insertStatus(studentId, (insertErr) => {
                    if (insertErr) {
                        console.error('Error inserting application status:', insertErr);
                        return res.status(500).json({ success: false, message: 'Error inserting application status.' });
                    }

                    // Step 3: Update the status to 'rejected'
                    adminModel.updateStatusToRejected(studentId, (updateErr) => {
                        if (updateErr) {
                            console.error('Error updating status to rejected:', updateErr);
                            return res.status(500).json({ success: false, message: 'Error rejecting student.' });
                        }

                        return res.json({
                            success: true,
                            message: 'Student application rejected successfully!',
                        });
                    });
                });
                return; // Prevent further execution
            }

            // Step 4: If status exists, check if it's already rejected
            const currentStatus = results[0].status;
            if (currentStatus === 'rejected') {
                return res.json({
                    success: false,
                    message: 'Student application is already rejected.',
                });
            }

            // Step 5: Update the status to 'rejected'
            adminModel.updateStatusToRejected(studentId, (updateErr) => {
                if (updateErr) {
                    console.error('Error updating status to rejected:', updateErr);
                    return res.status(500).json({ success: false, message: 'Error rejecting student.' });
                }

                return res.json({
                    success: true,
                    message: 'Student application rejected successfully!',
                });
            });
        });
    },
    


};

module.exports = adminController;