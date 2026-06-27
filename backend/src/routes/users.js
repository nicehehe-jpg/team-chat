const router = require('express').Router();
const auth = require('../middlewares/auth');
const { getUsers, getMe, updateMe } = require('../controllers/userController');

router.get('/', auth, getUsers);
router.get('/me', auth, getMe);
router.put('/me', auth, updateMe);

module.exports = router;
