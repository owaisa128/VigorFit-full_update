const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const MembershipPlan = require('../models/MembershipPlan');

const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token provided',
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim() === '') {
    console.error('❌ JWT_SECRET is missing in environment variables');
    return res.status(500).json({
      success: false,
      message: 'Server error: JWT_SECRET environment variable is missing',
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.trainerSetup === true) {
      const path = req.originalUrl.split('?')[0];
      const canReadProfile = req.method === 'GET' && path === '/api/auth/profile';
      const canCompleteProfile = req.method === 'POST' && path === '/api/trainers/complete-profile';
      if (!canReadProfile && !canCompleteProfile) {
        return res.status(403).json({
          success: false,
          message: 'Complete your trainer profile before accessing other account features',
        });
      }

      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
          success: false,
          message: 'Database connection unavailable',
        });
      }

      const user = await User.findById(decoded.id).select('-password');
      if (!user || user.role !== 'trainer' || user.trainerApprovalStatus !== 'awaiting_profile') {
        return res.status(403).json({
          success: false,
          message: 'Trainer profile setup access has expired or is no longer available',
        });
      }

      req.user = user;
      req.trainerSetupOnly = true;
      return next();
    }

    // If database connection is active, optionally load user object excluding password
    if (mongoose.connection.readyState === 1) {
      try {
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          if (user.role === 'user' && user.membership?.planSlug) {
            const plan = await MembershipPlan.findOne({ slug: user.membership.planSlug })
              .select('slug active featureKeys name');
            req.membershipPlan = plan;
            user.membership.featureKeys = plan?.active ? plan.featureKeys || [] : [];
          }
          req.user = user;
        } else {
          req.user = { _id: decoded.id, id: decoded.id, role: decoded.role || 'user' };
        }
      } catch (dbErr) {
        req.user = { _id: decoded.id, id: decoded.id, role: decoded.role || 'user' };
      }
    } else {
      req.user = { _id: decoded.id, id: decoded.id, role: decoded.role || 'user' };
    }

    next();
  } catch (error) {
    console.error('JWT Verification Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed or expired',
    });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Not authorized as an administrator',
    });
  }
};

module.exports = { protect, admin };
