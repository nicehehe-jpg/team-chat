const router = require('express').Router();
const auth = require('../middlewares/auth');
const requireAdmin = require('../middlewares/requireAdmin');
const { listUsers, approveUser, updateUser, deleteUser } = require('../controllers/adminController');

router.use(auth, requireAdmin);

router.get('/users', listUsers);
router.patch('/users/:id/approve', approveUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

module.exports = router;
