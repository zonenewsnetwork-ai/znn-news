// ✅ Auth disabled (no Firebase required)
module.exports = (req, res, next) => {
  next();
};