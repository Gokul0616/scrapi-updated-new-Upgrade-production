const express = require('express');
const router = express.Router();
const Actor = require('../models/Actor');
const Run = require('../models/Run');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { getInputFields, getOutputFields } = require('../actors/registry');

// Get all actors (protected)
// For Store: returns public actors (isPublic=true)
// For Actors: add ?userActors=true to get user's used/bookmarked actors
// For My Actors: add ?myActors=true to get user's private actors
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { category, search, bookmarked, myActors, userActors } = req.query;
    
    if (userActors === 'true') {
      // Get user's used and bookmarked actors
      const user = await User.findById(req.userId);
      const bookmarkedActorIds = user.bookmarkedActors || [];
      
      // Find actors user has created runs with
      const runs = await Run.find({ userId: req.userId }).distinct('actorId');
      
      // Combine bookmarked and used actors (unique)
      const actorIds = [...new Set([...bookmarkedActorIds, ...runs])];
      
      if (actorIds.length === 0) {
        return res.json([]);
      }
      
      // Fetch the actual actor documents
      const actors = await Actor.find({ 
        actorId: { $in: actorIds },
        isPublic: true 
      }).sort({ 'stats.runs': -1 });
      
      // Get run statistics for each actor
      const actorsWithStats = await Promise.all(actors.map(async (actor) => {
        // Get total runs count for this user and actor
        const totalRuns = await Run.countDocuments({ 
          userId: req.userId, 
          actorId: actor.actorId 
        });
        
        // Get last run details
        const lastRun = await Run.findOne({ 
          userId: req.userId, 
          actorId: actor.actorId 
        }).sort({ startedAt: -1 });
        
        return {
          ...actor.toObject(),
          isBookmarkedByUser: bookmarkedActorIds.includes(actor.actorId),
          hasRuns: runs.includes(actor.actorId),
          userRunStats: {
            totalRuns,
            lastRun: lastRun ? {
              runId: lastRun.runId,
              status: lastRun.status,
              startedAt: lastRun.startedAt,
              finishedAt: lastRun.finishedAt,
              duration: lastRun.finishedAt && lastRun.startedAt 
                ? Math.round((new Date(lastRun.finishedAt) - new Date(lastRun.startedAt)) / 1000) 
                : null
            } : null
          }
        };
      }));
      
      return res.json(actorsWithStats);
    }
    
    let query = {};
    
    if (myActors === 'true') {
      // User's private actors
      query.userId = req.userId;
    } else {
      // Public actors (Store)
      query.isPublic = true;
    }
    
    if (category) query.category = category;
    if (search) query.name = { $regex: search, $options: 'i' };
    
    const actors = await Actor.find(query).sort({ 'stats.runs': -1 });
    res.json(actors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get actor by ID (protected)
router.get('/:actorId', authMiddleware, async (req, res) => {
  try {
    const actor = await Actor.findOne({ actorId: req.params.actorId });
    if (!actor) return res.status(404).json({ error: 'Actor not found' });
    
    // Check access: public actors or user's own actors
    if (!actor.isPublic && actor.userId && actor.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Add field schemas from registry
    const inputFields = getInputFields(req.params.actorId);
    const outputFields = getOutputFields(req.params.actorId);
    
    const actorWithFields = {
      ...actor.toObject(),
      inputFields,
      outputFields
    };
    
    res.json(actorWithFields);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create actor (protected) - User creates private actor
router.post('/', authMiddleware, async (req, res) => {
  try {
    const actor = new Actor({
      ...req.body,
      userId: req.userId, // Set owner
      isPublic: false // User's private actor
    });
    await actor.save();
    res.status(201).json(actor);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Toggle bookmark (protected)
router.patch('/:actorId/bookmark', authMiddleware, async (req, res) => {
  try {
    const actor = await Actor.findOne({ actorId: req.params.actorId });
    if (!actor) return res.status(404).json({ error: 'Actor not found' });
    
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Check if actor is already bookmarked
    const bookmarkIndex = user.bookmarkedActors.indexOf(req.params.actorId);
    
    if (bookmarkIndex > -1) {
      // Remove bookmark
      user.bookmarkedActors.splice(bookmarkIndex, 1);
    } else {
      // Add bookmark
      user.bookmarkedActors.push(req.params.actorId);
    }
    
    await user.save();
    
    res.json({ 
      actorId: req.params.actorId,
      isBookmarked: bookmarkIndex === -1,
      message: bookmarkIndex === -1 ? 'Actor bookmarked' : 'Bookmark removed'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update pricing model (protected)
router.patch('/:actorId/pricing-model', authMiddleware, async (req, res) => {
  try {
    const { pricingModel } = req.body;
    
    if (!pricingModel) {
      return res.status(400).json({ error: 'Pricing model is required' });
    }
    
    const actor = await Actor.findOne({ actorId: req.params.actorId });
    if (!actor) return res.status(404).json({ error: 'Actor not found' });
    
    // Update pricing model
    actor.pricingModel = pricingModel;
    await actor.save();
    
    res.json({ 
      actorId: req.params.actorId,
      pricingModel: actor.pricingModel,
      message: 'Pricing model updated successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;