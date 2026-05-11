const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// File upload setup
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Database setup
const db = new sqlite3.Database('./safestay.db');

// Create tables
db.serialize(() => {
    // Admin table
    db.run(`CREATE TABLE IF NOT EXISTS admin (
        adminID INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    // Student table
    db.run(`CREATE TABLE IF NOT EXISTS student (
        studentID INTEGER PRIMARY KEY AUTOINCREMENT,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phoneNumber TEXT,
        password TEXT NOT NULL,
        institution TEXT,
        course TEXT,
        budgetRange TEXT,
        preferredAreas TEXT
    )`);

    // Landlord table
    db.run(`CREATE TABLE IF NOT EXISTS landlord (
        landlordID INTEGER PRIMARY KEY AUTOINCREMENT,
        adminID INTEGER,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phoneNumber TEXT,
        password TEXT NOT NULL,
        verificationStatus TEXT DEFAULT 'pending',
        FOREIGN KEY (adminID) REFERENCES admin(adminID)
    )`);

    // Accommodation table
    db.run(`CREATE TABLE IF NOT EXISTS accommodation (
        accommodationID INTEGER PRIMARY KEY AUTOINCREMENT,
        adminID INTEGER,
        landlordID INTEGER NOT NULL,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        price REAL NOT NULL,
        numberOfRooms INTEGER,
        availabilityStatus TEXT DEFAULT 'available',
        description TEXT,
        latitude REAL,
        longitude REAL,
        imagePath TEXT,
        verified INTEGER DEFAULT 0,
        FOREIGN KEY (adminID) REFERENCES admin(adminID),
        FOREIGN KEY (landlordID) REFERENCES landlord(landlordID)
    )`);

    // Booking table
    db.run(`CREATE TABLE IF NOT EXISTS booking (
        bookingID INTEGER PRIMARY KEY AUTOINCREMENT,
        studentID INTEGER NOT NULL,
        accommodationID INTEGER NOT NULL,
        adminID INTEGER,
        bookingDate TEXT,
        startDate TEXT,
        endDate TEXT,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (studentID) REFERENCES student(studentID),
        FOREIGN KEY (accommodationID) REFERENCES accommodation(accommodationID),
        FOREIGN KEY (adminID) REFERENCES admin(adminID)
    )`);

    // Review table
    db.run(`CREATE TABLE IF NOT EXISTS review (
        reviewID INTEGER PRIMARY KEY AUTOINCREMENT,
        studentID INTEGER NOT NULL,
        accommodationID INTEGER NOT NULL,
        safetyRating INTEGER,
        cleanlinessRating INTEGER,
        wifiRating INTEGER,
        landlordBehaviorRating INTEGER,
        comment TEXT,
        rating REAL,
        reviewDate TEXT,
        FOREIGN KEY (studentID) REFERENCES student(studentID),
        FOREIGN KEY (accommodationID) REFERENCES accommodation(accommodationID)
    )`);

    // Verification table
    db.run(`CREATE TABLE IF NOT EXISTS verification (
        verificationID INTEGER PRIMARY KEY AUTOINCREMENT,
        landlordID INTEGER NOT NULL,
        adminID INTEGER,
        status TEXT DEFAULT 'pending',
        verificationDate TEXT,
        idDocumentPath TEXT,
        propertyProofPath TEXT,
        FOREIGN KEY (landlordID) REFERENCES landlord(landlordID),
        FOREIGN KEY (adminID) REFERENCES admin(adminID)
    )`);

    // Payment table
    db.run(`CREATE TABLE IF NOT EXISTS payment (
        paymentID INTEGER PRIMARY KEY AUTOINCREMENT,
        bookingID INTEGER NOT NULL,
        amount REAL NOT NULL,
        paymentDate TEXT,
        paymentMethod TEXT,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (bookingID) REFERENCES booking(bookingID)
    )`);

    // Report table for scam reporting
    db.run(`CREATE TABLE IF NOT EXISTS report (
        reportID INTEGER PRIMARY KEY AUTOINCREMENT,
        studentID INTEGER NOT NULL,
        accommodationID INTEGER NOT NULL,
        reason TEXT,
        description TEXT,
        evidencePath TEXT,
        reportDate TEXT,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (studentID) REFERENCES student(studentID),
        FOREIGN KEY (accommodationID) REFERENCES accommodation(accommodationID)
    )`);

    // Insert sample admin
    db.run(`INSERT OR IGNORE INTO admin (firstName, lastName, email, password) 
            VALUES ('Super', 'Admin', 'admin@safestay.com', '$2b$10$hash')`);
});

// Helper function to hash passwords
const hashPassword = async (password) => {
    return await bcrypt.hash(password, 10);
};

// ============= API ROUTES =============

// Register student
app.post('/api/register/student', async (req, res) => {
    const { firstName, lastName, email, phoneNumber, password, institution, course, budgetRange, preferredAreas } = req.body;
    try {
        const hashedPassword = await hashPassword(password);
        db.run(`INSERT INTO student (firstName, lastName, email, phoneNumber, password, institution, course, budgetRange, preferredAreas)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [firstName, lastName, email, phoneNumber, hashedPassword, institution, course, budgetRange, preferredAreas],
            function(err) {
                if (err) {
                    res.status(400).json({ error: err.message });
                } else {
                    res.json({ success: true, studentID: this.lastID });
                }
            });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login student
app.post('/api/login/student', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM student WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) {
            res.status(401).json({ error: 'Invalid credentials' });
        } else {
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                res.json({ success: true, user: { studentID: user.studentID, firstName: user.firstName, email: user.email, type: 'student' } });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        }
    });
});

// Register landlord
app.post('/api/register/landlord', async (req, res) => {
    const { firstName, lastName, email, phoneNumber, password } = req.body;
    try {
        const hashedPassword = await hashPassword(password);
        db.run(`INSERT INTO landlord (firstName, lastName, email, phoneNumber, password, verificationStatus)
                VALUES (?, ?, ?, ?, ?, 'pending')`,
            [firstName, lastName, email, phoneNumber, hashedPassword],
            function(err) {
                if (err) {
                    res.status(400).json({ error: err.message });
                } else {
                    res.json({ success: true, landlordID: this.lastID });
                }
            });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Login landlord
app.post('/api/login/landlord', (req, res) => {
    const { email, password } = req.body;
    db.get(`SELECT * FROM landlord WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) {
            res.status(401).json({ error: 'Invalid credentials' });
        } else {
            const match = await bcrypt.compare(password, user.password);
            if (match) {
                res.json({ success: true, user: { landlordID: user.landlordID, firstName: user.firstName, email: user.email, verificationStatus: user.verificationStatus, type: 'landlord' } });
            } else {
                res.status(401).json({ error: 'Invalid credentials' });
            }
        }
    });
});

// Get all accommodations (with filters)
app.get('/api/accommodations', (req, res) => {
    const { minPrice, maxPrice, maxDistance, nsfasOnly } = req.query;
    let query = `SELECT a.*, l.firstName as landlordFirstName, l.lastName as landlordLastName 
                 FROM accommodation a 
                 JOIN landlord l ON a.landlordID = l.landlordID 
                 WHERE a.availabilityStatus = 'available' AND a.verified = 1`;
    let params = [];
    
    if (minPrice) {
        query += ` AND a.price >= ?`;
        params.push(minPrice);
    }
    if (maxPrice) {
        query += ` AND a.price <= ?`;
        params.push(maxPrice);
    }
    
    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Get single accommodation
app.get('/api/accommodations/:id', (req, res) => {
    db.get(`SELECT a.*, l.firstName as landlordFirstName, l.lastName as landlordLastName 
            FROM accommodation a 
            JOIN landlord l ON a.landlordID = l.landlordID 
            WHERE a.accommodationID = ?`, [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(row);
        }
    });
});

// Add accommodation (landlord)
app.post('/api/accommodations', upload.single('image'), (req, res) => {
    const { landlordID, name, address, price, numberOfRooms, description, latitude, longitude } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    
    db.run(`INSERT INTO accommodation (landlordID, name, address, price, numberOfRooms, availabilityStatus, description, latitude, longitude, imagePath, verified)
            VALUES (?, ?, ?, ?, ?, 'available', ?, ?, ?, ?, 0)`,
        [landlordID, name, address, price, numberOfRooms, description, latitude, longitude, imagePath],
        function(err) {
            if (err) {
                res.status(400).json({ error: err.message });
            } else {
                res.json({ success: true, accommodationID: this.lastID });
            }
        });
});

// Add review
app.post('/api/reviews', (req, res) => {
    const { studentID, accommodationID, safetyRating, cleanlinessRating, wifiRating, landlordBehaviorRating, comment } = req.body;
    const avgRating = (safetyRating + cleanlinessRating + wifiRating + landlordBehaviorRating) / 4;
    const reviewDate = new Date().toISOString();
    
    db.run(`INSERT INTO review (studentID, accommodationID, safetyRating, cleanlinessRating, wifiRating, landlordBehaviorRating, comment, rating, reviewDate)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [studentID, accommodationID, safetyRating, cleanlinessRating, wifiRating, landlordBehaviorRating, comment, avgRating, reviewDate],
        function(err) {
            if (err) {
                res.status(400).json({ error: err.message });
            } else {
                res.json({ success: true, reviewID: this.lastID });
            }
        });
});

// Get reviews for accommodation
app.get('/api/reviews/:accommodationID', (req, res) => {
    db.all(`SELECT r.*, s.firstName, s.lastName 
            FROM review r 
            JOIN student s ON r.studentID = s.studentID 
            WHERE r.accommodationID = ? 
            ORDER BY r.reviewDate DESC`, [req.params.accommodationID], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Report scam
app.post('/api/reports', upload.single('evidence'), (req, res) => {
    const { studentID, accommodationID, reason, description } = req.body;
    const evidencePath = req.file ? `/uploads/${req.file.filename}` : null;
    const reportDate = new Date().toISOString();
    
    db.run(`INSERT INTO report (studentID, accommodationID, reason, description, evidencePath, reportDate, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [studentID, accommodationID, reason, description, evidencePath, reportDate],
        function(err) {
            if (err) {
                res.status(400).json({ error: err.message });
            } else {
                res.json({ success: true, reportID: this.lastID });
            }
        });
});

// Get pending verifications (admin)
app.get('/api/admin/pending-verifications', (req, res) => {
    db.all(`SELECT v.*, l.firstName, l.lastName, l.email 
            FROM verification v 
            JOIN landlord l ON v.landlordID = l.landlordID 
            WHERE v.status = 'pending'`, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Update verification status
app.put('/api/admin/verify/:verificationID', (req, res) => {
    const { status, adminID } = req.body;
    const verificationDate = new Date().toISOString();
    
    db.run(`UPDATE verification SET status = ?, adminID = ?, verificationDate = ? WHERE verificationID = ?`,
        [status, adminID, verificationDate, req.params.verificationID],
        function(err) {
            if (err) {
                res.status(400).json({ error: err.message });
            } else {
                // Also update landlord's verification status
                db.get(`SELECT landlordID FROM verification WHERE verificationID = ?`, [req.params.verificationID], (err, row) => {
                    if (row) {
                        const landlordStatus = status === 'approved' ? 'verified' : 'rejected';
                        db.run(`UPDATE landlord SET verificationStatus = ? WHERE landlordID = ?`, [landlordStatus, row.landlordID]);
                    }
                });
                res.json({ success: true });
            }
        });
});

// Get reported listings (admin)
app.get('/api/admin/reports', (req, res) => {
    db.all(`SELECT r.*, a.name as accommodationName, s.firstName as studentFirstName, s.lastName as studentLastName
            FROM report r
            JOIN accommodation a ON r.accommodationID = a.accommodationID
            JOIN student s ON r.studentID = s.studentID
            WHERE r.status = 'pending'`, [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Delete accommodation (admin)
app.delete('/api/admin/accommodations/:id', (req, res) => {
    db.run(`DELETE FROM accommodation WHERE accommodationID = ?`, [req.params.id], function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

// Get landlord's accommodations
app.get('/api/landlord/:landlordID/accommodations', (req, res) => {
    db.all(`SELECT * FROM accommodation WHERE landlordID = ?`, [req.params.landlordID], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Create booking
app.post('/api/bookings', (req, res) => {
    const { studentID, accommodationID, startDate, endDate } = req.body;
    const bookingDate = new Date().toISOString();
    
    db.run(`INSERT INTO booking (studentID, accommodationID, bookingDate, startDate, endDate, status)
            VALUES (?, ?, ?, ?, ?, 'pending')`,
        [studentID, accommodationID, bookingDate, startDate, endDate],
        function(err) {
            if (err) {
                res.status(400).json({ error: err.message });
            } else {
                // Update accommodation availability
                db.run(`UPDATE accommodation SET availabilityStatus = 'unavailable' WHERE accommodationID = ?`, [accommodationID]);
                res.json({ success: true, bookingID: this.lastID });
            }
        });
});

// Get student bookings
app.get('/api/student/:studentID/bookings', (req, res) => {
    db.all(`SELECT b.*, a.name as accommodationName, a.address 
            FROM booking b
            JOIN accommodation a ON b.accommodationID = a.accommodationID
            WHERE b.studentID = ?`, [req.params.studentID], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Get system stats (admin)
app.get('/api/admin/stats', (req, res) => {
    db.get(`SELECT 
        (SELECT COUNT(*) FROM accommodation) as totalListings,
        (SELECT COUNT(*) FROM accommodation WHERE verified = 1) as verifiedListings,
        (SELECT COUNT(*) FROM report) as totalReports,
        (SELECT COUNT(*) FROM report WHERE status = 'pending') as pendingReports,
        (SELECT COUNT(*) FROM landlord WHERE verificationStatus = 'pending') as pendingVerifications,
        (SELECT COUNT(*) FROM student) as totalStudents,
        (SELECT COUNT(*) FROM booking) as totalBookings
    `, [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(row);
        }
    });
});

app.listen(port, () => {
    console.log(`SafeStay server running at http://localhost:${port}`);
});
