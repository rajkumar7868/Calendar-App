const express = require('express');
const router = express.Router();
const { detectConflicts, suggestTimes } = require('../services/conflictService');

router.post('/check-conflicts', (req, res) => {
  const { proposedEvent } = req.body;
  const existingEvents = req.body.existingEvents || req.store.events || [];
  if (!proposedEvent) return res.status(400).json({ error: 'proposedEvent required' });
  const conflicts = detectConflicts(proposedEvent, existingEvents);
  res.json({ conflicts });
});

router.post('/suggest-times', (req, res) => {
  const { proposedEvent } = req.body;
  const existingEvents = req.body.existingEvents || req.store.events || [];
  if (!proposedEvent) return res.status(400).json({ error: 'proposedEvent required' });
  const suggestions = suggestTimes(proposedEvent, existingEvents);
  res.json({ suggestions });
});

module.exports = router;
