const mongoose = require("mongoose");
const config = require("../../config");
const { AppError } = require("../../utils/apiResponse");
const { createAuditLog } = require("../../middleware/audit");
const enrollmentService = require("../enrollment/enrollment.service");
const logger = require("../../utils/logger");

const Enrollment = require("../../models/Enrollment");
const Payment = require("../../models/Payment");

async function initiatePayment(enrollmentId, method) {
  const enrollment = await Enrollment.findById(enrollmentId)
    .populate('feePlanId')
    .populate('payment');

  if (!enrollment) throw new AppError("Enrollment not found.", 404);
  if (enrollment.status !== "PENDING") {
    throw new AppError("Only pending enrollments can be paid.", 400);
  }

  if (enrollment.payment && enrollment.payment.status !== "FAILED") {
    return {
      paymentId: enrollment.payment._id,
      status: enrollment.payment.status,
      message: "Payment already in progress.",
    };
  }

  const paymentData = {
    enrollmentId,
    method,
    amount: enrollment.feePlanId.amount,
    currency: enrollment.feePlanId.currency,
    status: "INITIATED",
  };

  let payment;
  if (enrollment.payment) {
    payment = await Payment.findByIdAndUpdate(
      enrollment.payment._id,
      { ...paymentData, status: "INITIATED", failureReason: null },
      { new: true }
    );
  } else {
    payment = await Payment.create(paymentData);
  }

  const checkoutData = await createSafepayCheckout(payment, enrollment);

  return {
    paymentId: payment._id,
    checkoutUrl: checkoutData.checkoutUrl,
    reference: checkoutData.reference,
  };
}

async function createSafepayCheckout(payment, enrollment) {
  if (config.env === "production" && config.safepay.apiKey) {
    // Actual Safepay integration
  }

  const mockRef = `SF_${Date.now()}_${payment._id.toString().substring(0, 8)}`;
  await Payment.findByIdAndUpdate(payment._id, { gatewayRef: mockRef, status: "PENDING" });

  return {
    checkoutUrl: `${config.clientUrl}/payment/mock?ref=${mockRef}`,
    reference: mockRef,
  };
}

async function handleWebhook(payload, signature) {
  const { reference, status, transaction_id } = payload;

  const payment = await Payment.findOne({ gatewayRef: reference });

  if (!payment) {
    logger.warn("Webhook received for unknown payment reference", { reference });
    return { processed: false, reason: "Unknown reference" };
  }

  if (payment.status === "CONFIRMED") {
    logger.info("Duplicate webhook for already confirmed payment", { paymentId: payment._id });
    return { processed: true, reason: "Already confirmed" };
  }

  if (status === "success" || status === "completed") {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      await Payment.findByIdAndUpdate(payment._id, {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        gatewayResponse: payload,
      }, { session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    await enrollmentService.activateEnrollment(payment.enrollmentId);

    logger.info("Payment confirmed and enrollment activated", {
      paymentId: payment._id,
      enrollmentId: payment.enrollmentId,
    });

    return { processed: true };
  }

  if (status === "failed" || status === "cancelled") {
    await Payment.findByIdAndUpdate(payment._id, {
      status: "FAILED",
      failureReason: payload.failure_reason || "Payment failed",
      gatewayResponse: payload,
    });

    return { processed: true };
  }

  logger.warn("Unhandled webhook status", { status, reference });
  return { processed: false, reason: `Unhandled status: ${status}` };
}

async function verifyBankTransfer(paymentId, actorId, ip) {
  const payment = await Payment.findById(paymentId);

  if (!payment) throw new AppError("Payment not found.", 404);
  if (payment.method !== "BANK_TRANSFER") {
    throw new AppError("Only bank transfer payments can be manually verified.", 400);
  }
  if (payment.status === "CONFIRMED") {
    throw new AppError("Payment is already confirmed.", 400);
  }

  await Payment.findByIdAndUpdate(paymentId, {
    status: "CONFIRMED",
    confirmedAt: new Date(),
    verifiedBy: actorId,
  });

  await enrollmentService.activateEnrollment(payment.enrollmentId);

  await createAuditLog({
    actorId,
    action: "VERIFY_BANK_TRANSFER",
    targetType: "Payment",
    targetId: paymentId,
    before: { status: payment.status },
    after: { status: "CONFIRMED", verifiedBy: actorId },
    ipAddress: ip,
  });

  logger.info("Bank transfer manually verified", { paymentId, actorId });

  return { message: "Payment verified and enrollment activated." };
}

async function getPaymentStatus(enrollmentId) {
  const payment = await Payment.findOne({ enrollmentId }).select(
    "id method amount currency status gatewayRef createdAt confirmedAt"
  );

  if (!payment) throw new AppError("No payment found for this enrollment.", 404);
  return payment;
}

async function listPayments({ page, limit, skip, status, method, search }) {
  const query = {};

  if (status) query.status = status;
  if (method) query.method = method;

  const [payments, total] = await Promise.all([
    Payment.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: 'enrollmentId',
        populate: [
          {
            path: 'studentId',
            populate: { path: 'userId', select: 'fullName email phone' }
          },
          { path: 'feePlanId', select: 'name learningType' }
        ]
      }),
    Payment.countDocuments(query),
  ]);

  return { payments, total };
}

module.exports = {
  initiatePayment,
  handleWebhook,
  verifyBankTransfer,
  getPaymentStatus,
  listPayments,
};
