const { Router } = require("express");
const payment = require("./payment.controller");
const { authenticate } = require("../../middleware/auth");
const { authorize, ROLES } = require("../../middleware/rbac");
const { attachClientIp } = require("../../middleware/audit");

const router = Router();

// Webhook route - NO auth (Safepay server-to-server, verified by signature)
router.post("/webhooks/safepay", payment.handleWebhook);

// All other routes require auth
router.use(authenticate);
router.use(attachClientIp);

router.post("/initiate", authorize(ROLES.STUDENT), payment.initiatePayment);
router.get("/status/:enrollmentId", authorize(ROLES.STUDENT, ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN), payment.getPaymentStatus);
router.put("/verify-bank/:id", authorize(ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN), payment.verifyBankTransfer);
router.get("/", authorize(ROLES.HEAD_OFFICE, ROLES.SYSTEM_ADMIN), payment.listPayments);

module.exports = router;
