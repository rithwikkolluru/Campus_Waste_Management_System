/**
 * Simple XSS cleaner for backend data
 * Strips HTML tags and sensitive character sequences
 */
const sanitize = (val) => {
  if (typeof val !== 'string') return val;
  return val
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#47;')
    .trim();
};

/**
 * Middleware that auto-sanitizes the req.body strings
 */
const xssCleaner = (req, res, next) => {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize(req.body[key]);
      }
    }
  }
  next();
};

module.exports = { sanitize, xssCleaner };
