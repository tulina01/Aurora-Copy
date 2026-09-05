// Gates /api routes behind a Netlify Identity session. Netlify populates
// context.clientContext.user for any request carrying a valid Identity JWT,
// which serverless-http attaches to req.context (see netlify/functions/api.js).
module.exports = function requireIdentity(req, res, next) {
    if (process.env.REQUIRE_AUTH === 'false') {
        return next();
    }

    const user = req.context && req.context.clientContext && req.context.clientContext.user;

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    req.user = user;
    next();
};
