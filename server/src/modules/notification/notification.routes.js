const { Router } = require("express");
const notification = require("./notification.controller");
const { authenticate } = require("../../middleware/auth");

const router = Router();
router.use(authenticate);

router.get("/", notification.getMyNotifications);
router.put("/:id/read", notification.markAsRead);
router.put("/read-all", notification.markAllAsRead);

module.exports = router;
