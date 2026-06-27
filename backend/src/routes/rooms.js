const router = require('express').Router();
const auth = require('../middlewares/auth');
const {
  getRooms, createDirectRoom, createGroupRoom,
  getMessages, getRoomMembers, inviteMembers
} = require('../controllers/roomController');

router.get('/', auth, getRooms);
router.post('/direct', auth, createDirectRoom);
router.post('/group', auth, createGroupRoom);
router.get('/:id/messages', auth, getMessages);
router.get('/:id/members', auth, getRoomMembers);
router.post('/:id/invite', auth, inviteMembers);

module.exports = router;
