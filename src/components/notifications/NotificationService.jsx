import { api } from "@/api/firebaseClient";
import { sendWhatsappText } from "@/lib/whatsappClient";

// WhatsApp templates - one per point in the wash lifecycle a customer would
// want to hear about.
const templates = {
  checked_in: (data) => ({
    subject: "We've got it! ✅",
    message: `Hi ${data.customerName || "there"}! We've received your ${data.itemLabel} at ${data.businessName} and it's in the queue. We'll message you again once washing begins.`
  }),
  washing_started: (data) => ({
    subject: "Washing has started 🧽",
    message: `Hi ${data.customerName || "there"}! Your ${data.itemLabel} is now being washed at ${data.businessName}. We'll let you know the moment it's ready.`
  }),
  wash_ready: (data) => ({
    subject: "Your car is ready! 🚗",
    message: `Hello ${data.customerName || "Customer"}! Your ${data.itemLabel} is clean and ready for pickup at ${data.businessName}. Total: KES ${data.amount}. Thank you for choosing us!`
  }),
  payment_received: (data) => ({
    subject: "Payment Confirmed ✓",
    message: `Thank you ${data.customerName}! Payment of KES ${data.amount} received for ${data.itemLabel}. M-Pesa: ${data.mpesaRef || "N/A"}. Points earned: ${data.pointsEarned || 0}`
  })
};

// In-app notifications - hand-offs between roles within the tool itself
// (e.g. "a wash is ready for payment", "you've been assigned a job").
// These are separate from the customer-facing WhatsApp templates above.
export async function notifyInApp({ businessId, recipientEmails, title, message, referenceType, referenceId }) {
  const emails = [...new Set((recipientEmails || []).filter(Boolean).map((e) => e.toLowerCase()))];
  return Promise.all(
    emails.map((email) =>
      api.entities.Notification.create({
        business_id: businessId,
        channel: "in_app",
        recipient_email: email,
        subject: title,
        message,
        reference_type: referenceType,
        reference_id: referenceId,
        status: "sent",
        read: false,
      })
    )
  );
}

// A carpet/rug drop-off and a vehicle wash share the same Wash record shape
// (plate_number doubles as the carpet's reference number - see
// EnhancedCheckIn.jsx), so every status message needs to say "carpet order
// CARP-..." rather than "vehicle CARP-..." when type is "carpet".
function itemLabel(wash) {
  return wash.type === "carpet"
    ? `carpet order ${wash.plate_number}`
    : `vehicle ${wash.plate_number}`;
}

// Renders a template, records a Notification, and sends it over WhatsApp via
// whatsapp-server (see whatsapp-server/README.md) - that server calls Meta's
// WhatsApp Cloud API; while it's running in mock mode (no credentials yet)
// this still exercises the full path and marks the notification "sent"
// without an actual Meta call.
async function sendNotification({ businessId, type, recipientPhone, recipientName, data, customMessage }) {
  const template = !customMessage && templates[type] ? templates[type](data) : null;
  const subject = template?.subject || "";
  const message = customMessage || template?.message || "";

  const notification = await api.entities.Notification.create({
    business_id: businessId,
    type,
    channel: "whatsapp",
    recipient_phone: recipientPhone,
    recipient_name: recipientName,
    subject,
    message,
    reference_type: data?.referenceType,
    reference_id: data?.referenceId,
    status: "pending"
  });

  try {
    const result = await sendWhatsappText({ to: recipientPhone, message });
    await api.entities.Notification.update(notification.id, {
      status: "sent",
      sent_at: new Date().toISOString(),
      whatsapp_message_id: result.id,
    });
  } catch (error) {
    await api.entities.Notification.update(notification.id, {
      status: "failed",
      error_message: error.message
    });
  }

  return notification;
}

export async function sendCheckInConfirmation(wash, business) {
  if (!wash.customer_phone) return null;

  return sendNotification({
    businessId: wash.business_id,
    type: "checked_in",
    recipientPhone: wash.customer_phone,
    recipientName: wash.customer_name,
    data: {
      customerName: wash.customer_name,
      itemLabel: itemLabel(wash),
      businessName: business?.name || "our car wash",
      referenceType: "wash",
      referenceId: wash.id
    }
  });
}

export async function sendWashingStartedNotification(wash, business) {
  if (!wash.customer_phone) return null;

  return sendNotification({
    businessId: wash.business_id,
    type: "washing_started",
    recipientPhone: wash.customer_phone,
    recipientName: wash.customer_name,
    data: {
      customerName: wash.customer_name,
      itemLabel: itemLabel(wash),
      businessName: business?.name || "our car wash",
      referenceType: "wash",
      referenceId: wash.id
    }
  });
}

export async function sendWashReadyNotification(wash, business) {
  if (!wash.customer_phone) return null;

  return sendNotification({
    businessId: wash.business_id,
    type: "wash_ready",
    recipientPhone: wash.customer_phone,
    recipientName: wash.customer_name,
    data: {
      customerName: wash.customer_name,
      itemLabel: itemLabel(wash),
      businessName: business?.name || "our car wash",
      amount: wash.amount_due,
      referenceType: "wash",
      referenceId: wash.id
    }
  });
}

export async function sendPaymentConfirmation(wash, payment, business) {
  if (!wash.customer_phone) return null;

  return sendNotification({
    businessId: wash.business_id,
    type: "payment_received",
    recipientPhone: wash.customer_phone,
    recipientName: wash.customer_name,
    data: {
      customerName: wash.customer_name,
      itemLabel: itemLabel(wash),
      businessName: business?.name || "our car wash",
      amount: payment.amount,
      mpesaRef: payment.mpesa_receipt,
      referenceType: "payment",
      referenceId: payment.id
    }
  });
}

export default {
  notifyInApp,
  sendCheckInConfirmation,
  sendWashingStartedNotification,
  sendWashReadyNotification,
  sendPaymentConfirmation,
  templates
};
