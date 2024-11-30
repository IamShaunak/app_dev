const express = require('express');
const multer = require('multer');
const mysql = require('mysql');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// MySQL connection setup
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'user_data',
    multipleStatements: true
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err.message);
        return;
    }
    console.log('Connected to database');
});

// Set up multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Serve static files
app.use(express.static('public'));

// Parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));

// Handle form submission
app.post('/submit', upload.fields([
    { name: 'imageInput' },
    { name: 'videoInput' },
    { name: 'audioInput' },
]), (req, res) => {
    const text = req.body.textInput;
    const image = req.files['imageInput'] ? req.files['imageInput'][0].buffer : null;
    const video = req.files['videoInput'] ? req.files['videoInput'][0].buffer : null;
    const audioAttachment = req.files['audioInput'] ? req.files['audioInput'][0].buffer : null;
    let audioRecord = null;

    if (req.body.audioRecord) {
        const base64Data = req.body.audioRecord.replace(/^data:audio\/wav;base64,/, "");
        audioRecord = Buffer.from(base64Data, 'base64');
    }

    const sql = 'INSERT INTO user_data (text, image, video, audio_attachment, audio_record) VALUES (?, ?, ?, ?, ?)';
    db.query(sql, [text, image, video, audioAttachment, audioRecord], (err, result) => {
        if (err) {
            console.error('Error inserting data:', err.message);
            res.status(500).send('Failed to submit data');
            return;
        }
        res.send('Data submitted successfully');
    });
});

// Route to serve binary files
app.get('/file/:id/:type', (req, res) => {
    const id = req.params.id;
    const type = req.params.type;

    const sql = 'SELECT ?? FROM user_data WHERE id = ?';
    db.query(sql, [type, id], (err, result) => {
        if (err) {
            console.error('Error fetching file:', err.message);
            res.status(500).send('Failed to fetch file');
            return;
        }

        if (result.length === 0 || result[0][type] === null) {
            res.status(404).send('File not found');
            return;
        }

        const fileData = result[0][type];
        let contentType;

        switch (type) {
            case 'image':
                contentType = 'image/jpeg';
                break;
            case 'video':
                contentType = 'video/mp4';
                break;
            case 'audio_attachment':
            case 'audio_record':
                contentType = 'audio/wav';
                break;
            default:
                contentType = 'application/octet-stream';
                break;
        }

        res.setHeader('Content-Type', contentType);
        res.send(fileData);
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
