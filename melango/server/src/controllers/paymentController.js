const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Progress = require('../models/Progress');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const env = require('../config/env');
const stripeService = require('../services/stripeService');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');
const emailService = require('../services/emailService');

// Grants the seat once a payment reaches the paid state; safe to call twice.
async function fulfillPayment(payment) {
  if (payment.status === 'paid') return payment;

  payment.status = 'paid';
  payment.paidAt = new Date();
  await payment.save();

  const [course, student] = await Promise.all([
    Course.findById(payment.courseId),
    User.findById(payment.studentId),
  ]);
  if (!course || !student) return payment;

  const existing = await Enrollment.findOne({
    courseId: course._id,
    studentId: student._id,
  });

  if (!existing) {
    await Enrollment.create({
      courseId: course._id,
      studentId: student._id,
      paymentId: payment._id,
    });
    await Course.updateOne({ _id: course._id }, { $inc: { studentCount: 1 } });
    await Progress.updateOne(
      { courseId: course._id, studentId: student._id },
      { $setOnInsert: { completedMaterials: [], completionPercentage: 0 } },
      { upsert: true }
    );
  }

  await logActivity({
    userId: student._id,
    action: 'payment.completed',
    description: `Paid $${payment.amount} for "${course.courseName}"`,
    courseId: course._id,
    entityType: 'Payment',
    entityId: payment._id,
  });
  await notify({
    userId: student._id,
    title: 'Payment successful',
    message: `You now have access to "${course.courseName}"`,
    type: 'payment',
    courseId: course._id,
    link: `/courses/${course._id}`,
  });
  emailService.sendEnrollmentEmail(student, course);

  return payment;
}

// POST /api/payments/checkout  { courseId }
const createCheckout = asyncHandler(async (req, res) => {
  const { courseId } = req.body;
  if (!courseId) throw ApiError.badRequest('courseId is required');

  const course = await Course.findById(courseId);
  if (!course) throw ApiError.notFound('Course not found');
  if (!course.isPremium || course.price <= 0) {
    throw ApiError.badRequest('This course is free - join it with the enrollment code');
  }

  const alreadyEnrolled = await Enrollment.exists({
    courseId: course._id,
    studentId: req.user._id,
  });
  if (alreadyEnrolled) throw ApiError.conflict('You already have access to this course');

  const alreadyPaid = await Payment.findOne({
    courseId: course._id,
    studentId: req.user._id,
    status: 'paid',
  });
  if (alreadyPaid) throw ApiError.conflict('You have already paid for this course');

  const payment = await Payment.create({
    courseId: course._id,
    studentId: req.user._id,
    amount: course.price,
    status: 'pending',
    provider: stripeService.isEnabled() ? 'stripe' : 'simulated',
  });

  // Without Stripe keys the checkout is simulated so the flow stays demoable.
  if (!stripeService.isEnabled()) {
    await fulfillPayment(payment);
    return created(res, {
      simulated: true,
      paymentId: payment._id,
      url: `${env.clientUrl}/payments/success?simulated=true&paymentId=${payment._id}`,
      message: 'Stripe is not configured - the payment was auto-approved in simulation mode',
    });
  }

  const session = await stripeService.createCheckoutSession({
    course,
    user: req.user,
    paymentId: payment._id,
  });

  payment.sessionId = session.id;
  await payment.save();

  return created(res, { url: session.url, sessionId: session.id, paymentId: payment._id });
});

// POST /api/payments/webhook - mounted with a raw body parser.
const handleWebhook = asyncHandler(async (req, res) => {
  let event;
  try {
    event = stripeService.constructWebhookEvent(req.body, req.headers['stripe-signature']);
  } catch (err) {
    return res.status(400).json({ success: false, message: `Webhook error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const paymentId = session.metadata?.paymentId || session.client_reference_id;

    const payment = paymentId
      ? await Payment.findById(paymentId)
      : await Payment.findOne({ sessionId: session.id });

    if (payment) {
      payment.paymentIntentId = session.payment_intent || '';
      await fulfillPayment(payment);
    }
  } else if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    await Payment.findOneAndUpdate({ sessionId: session.id }, { status: 'failed' });
  }

  return res.json({ received: true });
});

// POST /api/payments/confirm  { sessionId } - fallback when webhooks are unavailable.
const confirmPayment = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  if (!sessionId) throw ApiError.badRequest('sessionId is required');

  const payment = await Payment.findOne({ sessionId, studentId: req.user._id });
  if (!payment) throw ApiError.notFound('Payment not found');

  if (payment.status === 'paid') return ok(res, payment);

  const session = await stripeService.retrieveSession(sessionId);
  if (!session) throw ApiError.badRequest('Unable to verify the session with Stripe');
  if (session.payment_status !== 'paid') {
    throw ApiError.badRequest('This payment has not completed yet');
  }

  payment.paymentIntentId = session.payment_intent || '';
  await fulfillPayment(payment);

  return ok(res, payment);
});

// GET /api/payments/my
const myPayments = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'admin' ? {} : { studentId: req.user._id };

  const payments = await Payment.find(filter)
    .populate('courseId', 'courseName thumbnail price')
    .populate('studentId', 'name email')
    .sort({ createdAt: -1 });

  const totalPaid = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  return ok(res, { payments, totalPaid, stripeEnabled: stripeService.isEnabled() });
});

module.exports = { createCheckout, handleWebhook, confirmPayment, myPayments };
