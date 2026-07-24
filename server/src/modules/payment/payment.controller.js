const paymentService = require("./payment.service");
const { sendSuccess, sendPaginated } = require("../../utils/apiResponse");
const { parsePagination } = require("../../utils/pagination");

async function initiatePayment(req, res, next) {
  try {
    const { enrollmentId, method } = req.body;
    const result = await paymentService.initiatePayment(enrollmentId, method);
    return sendSuccess(res, result, "Payment initiated.");
  } catch (error) { next(error); }
}

async function handleWebhook(req, res, next) {
  try {
    const signature = req.headers["x-safepay-signature"] || "";
    const result = await paymentService.handleWebhook(req.body, signature);
    return res.status(200).json(result);
  } catch (error) { next(error); }
}

async function verifyBankTransfer(req, res, next) {
  try {
    const result = await paymentService.verifyBankTransfer(
      req.params.id, req.user.id, req.clientIp
    );
    return sendSuccess(res, result, "Bank transfer verified.");
  } catch (error) { next(error); }
}

async function getPaymentStatus(req, res, next) {
  try {
    const payment = await paymentService.getPaymentStatus(req.params.enrollmentId);
    return sendSuccess(res, payment, "Payment status retrieved.");
  } catch (error) { next(error); }
}

async function listPayments(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { status, method, search } = req.query;
    const { payments, total } = await paymentService.listPayments({
      page, limit, skip, status, method, search,
    });
    return sendPaginated(res, payments, total, page, limit, "Payments retrieved.");
  } catch (error) { next(error); }
}

module.exports = { initiatePayment, handleWebhook, verifyBankTransfer, getPaymentStatus, listPayments };
