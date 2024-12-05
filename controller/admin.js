const adminModel = require('../models/adminmodel');

const adminController = {
    addPost: async (req, res) => {
        const { title, content } = req.body;
        const userId = req.user?.id || 1; // Use the authenticated user ID or fallback to 1
    
        // Validate inputs
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required.' });
        }
    
        try {
            // Ensure title and content meet any additional validation rules
            if (title.length > 255) {
                return res.status(400).json({ error: 'Title must not exceed 255 characters.' });
            }
    
            // Call the model to add the post
            await adminModel.addPost(title, content, userId);
    
            // Send a success response
            res.status(201).json({ message: 'Post successfully added.' });
        } catch (err) {
            console.error('Error adding post:', err.message);
    
            // Distinguish between different types of errors if needed
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                return res.status(400).json({ error: 'Invalid data provided.' });
            }
    
            // Send a general error response for unexpected issues
            res.status(500).json({ error: 'Internal server error. Please try again later.' });
        }
    },

    home: (req, res) => {
        adminModel.getPosts()
            .then(posts => res.render('home', { posts }))
            .catch(() => res.status(500).send('Database error'));
    },
    // Fetch all posts
  fetchPosts: (req, res) => {
    adminModel.getPosts()  // Assuming getPosts is a function in adminModel
      .then(posts => res.json(posts))  // Send the posts as a JSON response
      .catch(() => res.status(500).send('Error fetching posts'));
  },

    application: (req, res) => {
        adminModel.getApplicationData()
            .then(students => {
                res.json(students); // Send the student data as JSON
            })
            .catch(err => {
                console.error("Database error:", err);
                res.status(500).json({ error: 'Database error' }); // Send an error response as JSON
            });
    },

    search:(req, res) => {
        const searchQuery = req.query.search;  // Make sure you use `search` instead of `query`
        adminModel.searchStudents(searchQuery)
          .then(students => {
            // Check if the request is expecting a JSON response
            if (req.accepts('json')) {
              res.json({ students });
            } else {
              res.render('application', { students });
            }
          })
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
            .then(students => {
                res.json(students); // Send the student data as JSON
            })
            .catch(err => {
                console.error("Error retrieving confirmed students:", err);
                res.status(500).json({ error: 'Error retrieving confirmed students' }); // Send an error response as JSON
            });
    },

    getRejectedStudents: (req, res) => {
        adminModel.getRejectedStudents()
            .then(students => {
                res.json(students); // Send the students as a JSON response
            })
            .catch(err => {
                console.error('Error retrieving rejected students:', err);
                res.status(500).json({ error: 'Error retrieving rejected students.' }); // Send an error message as JSON
            });
    },

    exportConfirmedStudents: (req, res) => {
        adminModel.exportConfirmedStudents()
            .then(filePath => {
                res.json({
                    success: true,
                    message: 'Export successful.',
                    filePath: filePath, // Provide the file path or a URL to access the file
                });
            })
            .catch(err => {
                console.error("Error exporting confirmed students:", err);
                res.status(500).json({
                    success: false,
                    message: 'Error exporting file.',
                    error: err.message || 'Unknown error',
                });
            });
    },
    renderYearLevelData: (req, res, next) => {
        adminModel.getYearLevelData((err, yearResults) => {
            if (err) {
                console.error("Error fetching year level data:", err);
                return res.status(500).json({
                    success: false,
                    message: "Error fetching year level data",
                    error: err.message,
                });
            }
            req.yearResults = yearResults; // Pass data to the next middleware
            next();
        });
    },

    renderDegreeProgramData: (req, res) => {
        const yearResults = req.yearResults;

        adminModel.getDegreeProgramData((err, degreeResults) => {
            if (err) {
                console.error("Error fetching degree program data:", err);
                return res.status(500).json({
                    success: false,
                    message: "Error fetching degree program data",
                    error: err.message,
                });
            }

            const totalStudents = yearResults.reduce((sum, result) => sum + result.count, 0);

            if (totalStudents === 0) {
                console.warn("No confirmed students found in the database");
                return res.json({
                    success: true,
                    message: "No data available for confirmed students",
                    data: {
                        yearLevelLabels: [],
                        yearLevelData: [],
                        degreeProgramLabels: [],
                        degreeProgramData: [],
                    },
                });
            }

            // Process data for visualization
            const yearLevelLabels = yearResults.map(result => `${result.year_level} Year`);
            const yearLevelData = yearResults.map(result => (result.count / totalStudents) * 100);

            const degreeProgramLabels = degreeResults.map(result => result.degree_program);
            const degreeProgramData = degreeResults.map(result => (result.count / totalStudents) * 100);

            res.json({
                success: true,
                message: "Data fetched and processed successfully",
                data: {
                    yearLevelLabels,
                    yearLevelData,
                    degreeProgramLabels,
                    degreeProgramData,
                },
            });
        });
    },
    
    renderAcceptanceVisualization: (req, res) => {
        adminModel.getAcceptanceRateByDate((err, results) => {
            if (err) {
                console.error('Error fetching acceptance rate data:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error',
                    error: err.message,
                });
            }
    
            // Ensure `results` contains data
            if (!results || results.length === 0) {
                console.warn('No data available for acceptance rate visualization');
                return res.json({
                    success: true,
                    message: 'No data available for acceptance rate visualization',
                    data: {
                        dateLabels: [],
                        acceptanceRates: [],
                    },
                });
            }
    
            // Process the results
            const dateLabels = results.map(result => result.date);
            const acceptanceRates = results.map(result => result.acceptance_rate);
    
            // Return data as JSON response
            res.json({
                success: true,
                message: 'Acceptance rate data fetched successfully',
                data: {
                    dateLabels,
                    acceptanceRates,
                },
            });
        });
    },
    getAcceptanceRateData: async (req, res) => {
        try {
            const results = await adminModel.fetchAcceptanceRate();
            res.json({
                success: true,
                message: "Acceptance rate data fetched successfully",
                data: results,
            });
        } catch (error) {
            console.error("Error fetching acceptance rate data:", error);
            res.status(500).json({
                success: false,
                message: "Error fetching acceptance rate data",
                error: error.message, // Optional: Include the error message for debugging
            });
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