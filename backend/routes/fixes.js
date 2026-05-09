const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const FixEntry = require('../models/FixEntry');
const ErrorEntry = require('../models/ErrorEntry');

// @route   GET api/fixes
// @desc    Get all generated fixes for a user
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const fixes = await FixEntry.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(fixes);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
});

// @route   DELETE api/fixes/:id
// @desc    Delete a generated fix and clear linked error AI fields
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const fixEntry = await FixEntry.findById(req.params.id);

    if (!fixEntry) {
      return res.status(404).json({ msg: 'Fix entry not found' });
    }

    if (fixEntry.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await FixEntry.findByIdAndDelete(req.params.id);

    await ErrorEntry.findOneAndUpdate(
      { _id: fixEntry.errorEntryId, userId: req.user.id },
      { aiFix: null, aiExplanation: null }
    );

    res.json({ msg: 'Fix deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: err.message || 'Server error' });
  }
});

module.exports = router;
