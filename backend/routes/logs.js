const express = require('express');
const router = express.Router();
const multer = require('multer');
const auth = require('../middleware/auth');
const LogFile = require('../models/LogFile');
const ErrorEntry = require('../models/ErrorEntry');

// Setup Multer for file upload in memory
const upload = multer({ storage: multer.memoryStorage() });

// @route   POST api/logs/upload
// @desc    Upload a log file, parse for errors, save to DB
// @access  Private
router.post('/upload', auth, upload.single('logfile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded' });
        }

        const content = req.file.buffer.toString('utf-8');
        const filename = req.file.originalname;

        // Save the log file to DB
        const newLogFile = new LogFile({
            userId: req.user.id,
            filename: filename,
            content: content
        });

        const savedLogFile = await newLogFile.save();

        // Parse content for errors
        const lines = content.split('\n');
        const errorKeywords = ['error', 'exception', 'failed', 'traceback', 'critical'];
        const foundErrors = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].toLowerCase();
            if (errorKeywords.some(keyword => line.includes(keyword))) {
                foundErrors.push({
                    userId: req.user.id,
                    logFileId: savedLogFile._id,
                    filename: filename,
                    errorMessage: lines[i].trim(),
                    lineNumber: i + 1,
                    source: 'log_upload',
                    severity: 'medium',
                    environment: 'unknown',
                    service: 'log-parser'
                });
            }
        }

        // Save parsed errors to DB
        if (foundErrors.length > 0) {
            await ErrorEntry.insertMany(foundErrors);
        }

        res.json({
            msg: 'File uploaded and parsed successfully',
            logFileId: savedLogFile._id,
            errorsFound: foundErrors.length
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/logs
// @desc    Get all log files for a user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const logs = await LogFile.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(logs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   DELETE api/logs/:id
// @desc    Delete a log file and its associated errors
// @access  Private
router.delete('/:id', auth, async (req, res) => {
    try {
        const logFile = await LogFile.findById(req.params.id);

        if (!logFile) {
            return res.status(404).json({ msg: 'Log file not found' });
        }

        // Check user
        if (logFile.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await LogFile.findByIdAndDelete(req.params.id);
        
        // Delete associated errors
        await ErrorEntry.deleteMany({ logFileId: req.params.id });

        res.json({ msg: 'Log file and associated errors deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;
