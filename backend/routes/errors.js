const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ErrorEntry = require('../models/ErrorEntry');
const LogFile = require('../models/LogFile');
const FixEntry = require('../models/FixEntry');
const { getAIFix } = require('../utils/ai');
const ErrorGroupingService = require('../utils/errorGrouping');

// @route   GET api/errors
// @desc    Get all errors for a user with grouping
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { group = 'false' } = req.query;
        const errors = await ErrorEntry.find({ userId: req.user.id }).sort({ createdAt: -1 });
        
        if (group === 'true') {
            const groupingService = new ErrorGroupingService();
            const groupedErrors = [];
            const processedGroups = new Set();
            
            for (const error of errors) {
                if (!error.groupId) {
                    // Group the error if it doesn't have a group
                    const groupInfo = groupingService.groupError(error, errors);
                    error.groupId = groupInfo.groupId;
                    await error.save();
                }
                
                if (!processedGroups.has(error.groupId)) {
                    const groupStats = groupingService.getGroupStatistics(error.groupId, errors);
                    groupedErrors.push({
                        ...error.toObject(),
                        groupStats,
                        isGroupRepresentative: true
                    });
                    processedGroups.add(error.groupId);
                }
            }
            
            res.json(groupedErrors);
        } else {
            res.json(errors);
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: err.message || 'Server error' });
    }
});

// @route   POST api/errors
// @desc    Create a new error entry (for SDK integration)
// @access  Private
router.post('/', auth, async (req, res) => {
    const realtime = req.app.get('realtime');
    try {
        const { filename, errorMessage, lineNumber, logFileId, type } = req.body;

        // Get existing errors for grouping
        const existingErrors = await ErrorEntry.find({ userId: req.user.id }).sort({ createdAt: -1 });
        
        // Apply error grouping
        const groupingService = new ErrorGroupingService();
        const groupInfo = groupingService.groupError({
            filename,
            errorMessage,
            type: type || 'javascript'
        }, existingErrors);

        const newError = new ErrorEntry({
            userId: req.user.id,
            filename,
            errorMessage,
            lineNumber,
            logFileId,
            groupId: groupInfo.groupId,
            type: type || 'javascript'
        });

        const savedError = await newError.save();

        // Broadcast real-time error with group info
        if (realtime) {
            realtime.broadcastError(req.user.id, {
                errorId: savedError._id,
                filename: savedError.filename,
                errorMessage: savedError.errorMessage,
                lineNumber: savedError.lineNumber,
                groupId: savedError.groupId,
                isDuplicate: groupInfo.isDuplicate,
                similarity: groupInfo.similarity,
                timestamp: savedError.createdAt
            });
        }

        res.status(201).json({
            ...savedError.toObject(),
            groupInfo
        });
    } catch (err) {
        console.error('Create error failed:', err.message || err);
        res.status(500).json({ msg: err.message || 'Failed to create error entry' });
    }
});

// @route   POST api/errors/ingest
// @desc    Ingest a single real-time error event
// @access  Private
router.post('/ingest', auth, async (req, res) => {
    try {
        const {
            logFileId,
            filename,
            errorMessage,
            stackTrace,
            lineNumber,
            severity,
            source,
            environment,
            service,
            release,
            platform,
            metadata
        } = req.body;

        if (!errorMessage || !filename) {
            return res.status(400).json({ msg: 'filename and errorMessage are required' });
        }

        const newError = new ErrorEntry({
            userId: req.user.id,
            logFileId: logFileId || null,
            filename,
            errorMessage,
            stackTrace: stackTrace || null,
            lineNumber: Number.isFinite(Number(lineNumber)) ? Number(lineNumber) : null,
            severity: severity || 'medium',
            source: source || 'manual',
            environment: environment || 'unknown',
            service: service || 'unknown',
            release: release || null,
            platform: platform || null,
            metadata: metadata && typeof metadata === 'object' ? metadata : {}
        });

        const saved = await newError.save();
        const realtime = req.app.get('realtime');
        if (realtime) {
            realtime.broadcastToUser(req.user.id, {
                event: 'error:new',
                payload: saved
            });
        }

        res.status(201).json(saved);
    } catch (err) {
        console.error('Ingest error event failed:', err.message || err);
        res.status(500).json({ msg: err.message || 'Failed to ingest error event' });
    }
});

// @route   GET api/errors/trends
// @desc    Get daily error counts for the last N days
// @access  Private
router.get('/trends', auth, async (req, res) => {
    try {
        const days = Math.min(Math.max(Number(req.query.days) || 14, 1), 90);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days + 1);
        startDate.setHours(0, 0, 0, 0);

        const rows = await ErrorEntry.aggregate([
            {
                $match: {
                    userId: new mongoose.Types.ObjectId(req.user.id),
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        day: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$createdAt'
                            }
                        }
                    },
                    count: { $sum: 1 },
                    critical: {
                        $sum: {
                            $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0]
                        }
                    }
                }
            },
            { $sort: { '_id.day': 1 } }
        ]);

        res.json({
            days,
            points: rows.map((row) => ({
                date: row._id.day,
                totalErrors: row.count,
                criticalErrors: row.critical
            }))
        });
    } catch (err) {
        console.error('Error trends failed:', err.message || err);
        res.status(500).json({ msg: err.message || 'Failed to load error trends' });
    }
});

// @route   POST api/errors/:id/fix
// @desc    Trigger AI to generate a fix for a specific error
// @access  Private
router.post('/:id/fix', auth, async (req, res) => {
    const realtime = req.app.get('realtime');
    try {
        const errorEntry = await ErrorEntry.findById(req.params.id);

        if (!errorEntry) {
            return res.status(404).json({ msg: 'Error entry not found' });
        }

        // Check user
        if (errorEntry.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        // Get context from log file
        const logFile = await LogFile.findById(errorEntry.logFileId);
        let context = "Context not available.";
        if (logFile) {
            const lines = logFile.content.split('\n');
            const startLine = Math.max(0, errorEntry.lineNumber - 5);
            const endLine = Math.min(lines.length - 1, errorEntry.lineNumber + 5);
            context = lines.slice(startLine, endLine + 1).join('\n');
        }

        // Call Groq API, but fall back to a deterministic response if provider fails
        let explanation;
        let fix;
        try {
            const aiResult = await getAIFix(errorEntry.errorMessage, context);
            explanation = aiResult.explanation;
            fix = aiResult.fix;
        } catch (aiErr) {
            console.error('Groq fallback activated:', aiErr.message || aiErr);
            explanation = `AI provider was unavailable. Basic analysis: the log indicates "${errorEntry.errorMessage}" around line ${errorEntry.lineNumber || 'unknown'}. Check recent changes near this section and validate inputs/dependencies for this code path.`;
            fix = `1) Inspect the code near line ${errorEntry.lineNumber || 'reported line'} in ${errorEntry.filename}.\n2) Add guard checks (null/undefined/type validation).\n3) Ensure required config/env values are present.\n4) Re-run and confirm the error no longer appears.\n\nProvider error: ${aiErr.message || 'Unknown provider error.'}`;
        }

        // Update error entry
        errorEntry.aiFix = fix;
        errorEntry.aiExplanation = explanation;
        await errorEntry.save();

        try {
            await FixEntry.findOneAndUpdate(
                { userId: req.user.id, errorEntryId: errorEntry._id },
                {
                    userId: req.user.id,
                    errorEntryId: errorEntry._id,
                    logFileId: errorEntry.logFileId || null,
                    filename: errorEntry.filename,
                    errorMessage: errorEntry.errorMessage,
                    lineNumber: errorEntry.lineNumber,
                    explanation,
                    fix
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        } catch (fixStoreErr) {
            // Do not fail the primary flow if historical data violates FixEntry constraints.
            console.error('FixEntry persistence warning:', fixStoreErr.message || fixStoreErr);
        }

        // Broadcast real-time update
        if (realtime) {
            realtime.broadcastFix(req.user.id, {
                errorId: errorEntry._id,
                filename: errorEntry.filename,
                errorMessage: errorEntry.errorMessage,
                explanation,
                fix,
                timestamp: new Date().toISOString()
            });
        }

        res.json(errorEntry);
    } catch (err) {
        console.error('Generate fix error:', err);
        res.status(500).json({ msg: err.message || 'Failed to generate AI fix.' });
    }
});

module.exports = router;
