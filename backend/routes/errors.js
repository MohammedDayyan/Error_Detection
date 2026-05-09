const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ErrorEntry = require('../models/ErrorEntry');
const LogFile = require('../models/LogFile');
const FixEntry = require('../models/FixEntry');
const { getAIFix } = require('../utils/ai');

// @route   GET api/errors
// @desc    Get all errors for a user
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const errors = await ErrorEntry.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(errors);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: err.message || 'Server error' });
    }
});

// @route   POST api/errors/:id/fix
// @desc    Trigger AI to generate a fix for a specific error
// @access  Private
router.post('/:id/fix', auth, async (req, res) => {
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

        res.json(errorEntry);
    } catch (err) {
        console.error('Generate fix error:', err);
        res.status(500).json({ msg: err.message || 'Failed to generate AI fix.' });
    }
});

module.exports = router;
