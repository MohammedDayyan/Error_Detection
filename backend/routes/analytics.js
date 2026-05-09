const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const ErrorEntry = require('../models/ErrorEntry');
const FixEntry = require('../models/FixEntry');
const LogFile = require('../models/LogFile');

// @route   GET api/analytics/overview
// @desc    Get analytics overview for dashboard
// @access  Private
router.get('/overview', auth, async (req, res) => {
    try {
        const { timeRange = '7d' } = req.query;
        const startDate = getDateRange(timeRange);

        const [
            totalErrors,
            criticalErrors,
            resolvedErrors,
            uniqueGroups,
            recentErrors,
            errorTrends,
            topErrorTypes,
            topFiles
        ] = await Promise.all([
            ErrorEntry.countDocuments({ 
                userId: req.user.id, 
                createdAt: { $gte: startDate } 
            }),
            ErrorEntry.countDocuments({ 
                userId: req.user.id, 
                createdAt: { $gte: startDate },
                severity: 'critical' 
            }),
            FixEntry.countDocuments({ 
                userId: req.user.id, 
                createdAt: { $gte: startDate } 
            }),
            ErrorEntry.distinct('groupId', { 
                userId: req.user.id, 
                createdAt: { $gte: startDate } 
            }).then(groups => groups.length),
            ErrorEntry.find({ userId: req.user.id })
                .sort({ createdAt: -1 })
                .limit(10),
            getErrorTrends(req.user.id, timeRange),
            getTopErrorTypes(req.user.id, timeRange),
            getTopErrorFiles(req.user.id, timeRange)
        ]);

        res.json({
            overview: {
                totalErrors,
                criticalErrors,
                resolvedErrors,
                uniqueGroups,
                resolutionRate: totalErrors > 0 ? (resolvedErrors / totalErrors * 100).toFixed(1) : 0
            },
            recentErrors,
            errorTrends,
            topErrorTypes,
            topFiles
        });
    } catch (err) {
        console.error('Analytics overview failed:', err.message || err);
        res.status(500).json({ msg: err.message || 'Failed to load analytics' });
    }
});

// @route   GET api/analytics/trends
// @desc    Get detailed error trends
// @access  Private
router.get('/trends', auth, async (req, res) => {
    try {
        const { timeRange = '7d', granularity = 'daily' } = req.query;
        const startDate = getDateRange(timeRange);
        
        const trends = await getErrorTrends(req.user.id, timeRange, granularity);
        
        res.json(trends);
    } catch (err) {
        console.error('Error trends failed:', err.message || err);
        res.status(500).json({ msg: err.message || 'Failed to load error trends' });
    }
});

// @route   GET api/analytics/performance
// @desc    Get performance metrics
// @access  Private
router.get('/performance', auth, async (req, res) => {
    try {
        const { timeRange = '7d' } = req.query;
        const startDate = getDateRange(timeRange);

        const [
            avgResolutionTime,
            errorFrequency,
            fixSuccessRate,
            errorSpikeAlerts
        ] = await Promise.all([
            getAverageResolutionTime(req.user.id, startDate),
            getErrorFrequency(req.user.id, startDate),
            getFixSuccessRate(req.user.id, startDate),
            getErrorSpikeAlerts(req.user.id, startDate)
        ]);

        res.json({
            avgResolutionTime,
            errorFrequency,
            fixSuccessRate,
            errorSpikeAlerts
        });
    } catch (err) {
        console.error('Performance analytics failed:', err.message || err);
        res.status(500).json({ msg: err.message || 'Failed to load performance metrics' });
    }
});

// Helper functions
function getDateRange(timeRange) {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
        case '1d':
            startDate.setDate(now.getDate() - 1);
            break;
        case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
        case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
        default:
            startDate.setDate(now.getDate() - 7);
    }
    
    return startDate;
}

async function getErrorTrends(userId, timeRange, granularity = 'daily') {
    const startDate = getDateRange(timeRange);
    const groupFormat = granularity === 'hourly' ? 
        '%Y-%m-%d %H:00:00' : 
        granularity === 'weekly' ? 
        '%Y-%U' : 
        '%Y-%m-%d';

    const trends = await ErrorEntry.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: groupFormat,
                        date: '$createdAt'
                    }
                },
                count: { $sum: 1 },
                critical: {
                    $sum: {
                        $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0]
                    }
                },
                high: {
                    $sum: {
                        $cond: [{ $eq: ['$severity', 'high'] }, 1, 0]
                    }
                },
                medium: {
                    $sum: {
                        $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0]
                    }
                },
                low: {
                    $sum: {
                        $cond: [{ $eq: ['$severity', 'low'] }, 1, 0]
                    }
                }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    return trends.map(trend => ({
        date: trend._id,
        total: trend.count,
        severity: {
            critical: trend.critical,
            high: trend.high,
            medium: trend.medium,
            low: trend.low
        }
    }));
}

async function getTopErrorTypes(userId, timeRange) {
    const startDate = getDateRange(timeRange);
    
    const topTypes = await ErrorEntry.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$type',
                count: { $sum: 1 },
                lastSeen: { $max: '$createdAt' }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    return topTypes.map(type => ({
        type: type._id || 'unknown',
        count: type.count,
        lastSeen: type.lastSeen
    }));
}

async function getTopErrorFiles(userId, timeRange) {
    const startDate = getDateRange(timeRange);
    
    const topFiles = await ErrorEntry.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: startDate }
            }
        },
        {
            $group: {
                _id: '$filename',
                count: { $sum: 1 },
                lastSeen: { $max: '$createdAt' },
                severity: { $first: '$severity' }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
    ]);

    return topFiles.map(file => ({
        filename: file._id,
        count: file.count,
        lastSeen: file.lastSeen,
        severity: file.severity
    }));
}

async function getAverageResolutionTime(userId, startDate) {
    const resolutions = await ErrorEntry.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                createdAt: { $gte: startDate },
                aiFix: { $exists: true, $ne: null }
            }
        },
        {
            $lookup: {
                from: 'fixentries',
                localField: '_id',
                foreignField: 'errorEntryId',
                as: 'fix'
            }
        },
        { $unwind: '$fix' },
        {
            $project: {
                resolutionTime: {
                    $subtract: ['$fix.createdAt', '$createdAt']
                }
            }
        }
    ]);

    if (resolutions.length === 0) return null;
    
    const avgTime = resolutions.reduce((sum, r) => sum + r.resolutionTime, 0) / resolutions.length;
    return Math.round(avgTime / (1000 * 60)); // Convert to minutes
}

async function getErrorFrequency(userId, startDate) {
    const errors = await ErrorEntry.find({
        userId,
        createdAt: { $gte: startDate }
    }).sort({ createdAt: 1 });

    if (errors.length < 2) return 0;

    const timeSpan = new Date(errors[errors.length - 1].createdAt) - new Date(errors[0].createdAt);
    const hours = timeSpan / (1000 * 60 * 60);
    
    return hours > 0 ? (errors.length / hours).toFixed(2) : errors.length;
}

async function getFixSuccessRate(userId, startDate) {
    const [totalErrors, errorsWithFixes] = await Promise.all([
        ErrorEntry.countDocuments({ userId, createdAt: { $gte: startDate } }),
        ErrorEntry.countDocuments({ 
            userId, 
            createdAt: { $gte: startDate },
            aiFix: { $exists: true, $ne: null }
        })
    ]);

    return totalErrors > 0 ? (errorsWithFixes / totalErrors * 100).toFixed(1) : 0;
}

async function getErrorSpikeAlerts(userId, startDate) {
    const trends = await getErrorTrends(userId, '7d', 'hourly');
    const alerts = [];
    
    for (let i = 1; i < trends.length; i++) {
        const current = trends[i].total;
        const previous = trends[i - 1].total;
        const increase = previous > 0 ? ((current - previous) / previous) * 100 : 0;
        
        if (increase > 100 && current > 5) { // More than 100% increase with at least 5 errors
            alerts.push({
                timestamp: trends[i].date,
                message: `Error spike detected: ${current} errors (${increase.toFixed(0)}% increase)`,
                severity: increase > 200 ? 'critical' : 'warning'
            });
        }
    }
    
    return alerts;
}

module.exports = router;
