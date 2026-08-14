const Stripe = require('stripe');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

let stripe = null;

if (env.stripeSecretKey) {
  stripe = new Stripe(env.stripeSecretKey);
} else {
  // eslint-disable-next-line no-console
  console.log('[stripe] STRIPE_SECRET_KEY not set - payments run in simulation mode.');
}

const isEnabled = () => Boolean(stripe);

async function createCheckoutSession({ course, user, paymentId }) {
  if (!stripe) throw ApiError.badRequest('Payments are not configured on this server');

  return stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: user.email,
    client_reference_id: String(paymentId),
    metadata: {
      paymentId: String(paymentId),
      courseId: String(course._id),
      studentId: String(user._id),
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(course.price * 100),
          product_data: {
            name: course.courseName,
            description: (course.description || '').slice(0, 300) || undefined,
          },
        },
      },
    ],
    success_url: `${env.clientUrl}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.clientUrl}/payments/cancel`,
  });
}

// Verifies the signature when a webhook secret is configured, otherwise trusts the body
// so the flow stays testable with the Stripe CLI absent.
function constructWebhookEvent(rawBody, signature) {
  if (!stripe || !env.stripeWebhookSecret || !signature) {
    return typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString());
  }
  return stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
}

async function retrieveSession(sessionId) {
  if (!stripe) return null;
  return stripe.checkout.sessions.retrieve(sessionId);
}

module.exports = { isEnabled, createCheckoutSession, constructWebhookEvent, retrieveSession };
