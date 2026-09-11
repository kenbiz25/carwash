import { api } from "@/api/firebaseClient";
import { sendWhatsappText } from "@/lib/whatsappClient";

// Notification Templates
const templates = {
  wash_ready: (data) => ({
    subject: "Your car is ready! 🚗",
    message: `Hello ${data.customerName || "Customer"}! Your ${data.vehiclePlate} is clean and ready for pickup at ${data.businessName}. Total: KES ${data.amount}. Thank you for choosing us!`
  }),
  wash_complete: (data) => ({
    subject: "Wash Completed",
    message: `Hi ${data.customerName}, your ${data.vehiclePlate} wash is complete. Services: ${data.services}. Amount: KES ${data.amount}. Receipt: ${data.receiptUrl || "Available at pickup"}`
  }),
  payment_received: (data) => ({
    subject: "Payment Confirmed ✓",
    message: `Thank you ${data.customerName}! Payment of KES ${data.amount} received for ${data.vehiclePlate}. M-Pesa: ${data.mpesaRef || "N/A"}. Points earned: ${data.pointsEarned || 0}`
  }),
  loyalty_update: (data) => ({
    subject: "Loyalty Points Update",
    message: `Hi ${data.customerName}! You now have ${data.totalPoints} points. ${data.tier ? `You're a ${data.tier} member!` : ""} ${data.nextReward || ""}`
  }),
  low_stock: (data) => ({
    subject: "⚠️ Low Stock Alert",
    message: `${data.businessName}: ${data.itemName} is running low (${data.currentQty} ${data.unit} remaining). Threshold: ${data.threshold} ${data.unit}. Supplier: ${data.supplierName || "Not set"}`
  }),
  shift_reminder: (data) => ({
    subject: "Shift Reminder",
    message: `Hi ${data.staffName}, reminder: You have a shift tomorrow at ${data.businessName}. Time: ${data.shiftStart} - ${data.shiftEnd}. Bay: ${data.bay || "TBD"}`
  }),
  membership_renewal: (data) => ({
    subject: "Membership Renewal",
    message: `Hi ${data.customerName}, your ${data.planName} membership expires on ${data.expiryDate}. Renew now to continue enjoying unlimited washes! Reply YES to auto-renew.`
  })
};

// SMS Provider Placeholders
const smsProviders = {
  africastalking: {
    name: "Africa's Talking",
    send: async (phone, message, config) => {
      // Placeholder: Replace with actual Africa's Talking API call
      console.log("[Africa's Talking SMS] To:", phone, "Message:", message);
      // const response = await fetch('https://api.africastalking.com/version1/messaging', {
      //   method: 'POST',
      //   headers: {
      //     'apiKey': config.apiKey,
      //     'Content-Type': 'application/x-www-form-urlencoded'
      //   },
      //   body: `username=${config.username}&to=${phone}&message=${encodeURIComponent(message)}`
      // });
      return { success: true, provider: "africastalking", mock: true };
    }
  },
  twilio: {
    name: "Twilio",
    send: async (phone, message, config) => {
      // Placeholder: Replace with actual Twilio API call
      console.log("[Twilio SMS] To:", phone, "Message:", message);
      // const client = require('twilio')(config.accountSid, config.authToken);
      // await client.messages.create({
      //   body: message,
      //   from: config.fromNumber,
      //   to: phone
      // });
      return { success: true, provider: "twilio", mock: true };
    }
  },
  whatsapp: {
    name: "WhatsApp",
    send: async (phone, message) => {
      // Real send via whatsapp-server (see whatsapp-server/README.md) — that
      // server calls Meta's WhatsApp Cloud API; while it's running in mock
      // mode (no credentials yet) this still exercises the full path and
      // marks the notification "sent" without an actual Meta call.
      try {
        const result = await sendWhatsappText({ to: phone, message });
        return { success: true, provider: "whatsapp", messageId: result.id };
      } catch (err) {
        return { success: false, provider: "whatsapp", error: err.message };
      }
    }
  }
};

// In-app notifications — hand-offs between roles within the tool itself
// (e.g. "a wash is ready for payment", "you've been assigned a job").
// These are separate from the customer-facing SMS templates above.
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

// Main notification functions
export async function sendNotification({ businessId, type, channel = "sms", recipientPhone, recipientEmail, recipientName, data, customMessage }) {
  // Generate message from template or use custom
  let subject = "";
  let message = customMessage || "";
  
  if (!customMessage && templates[type]) {
    const template = templates[type](data);
    subject = template.subject;
    message = template.message;
  }

  // Create notification record
  const notification = await api.entities.Notification.create({
    business_id: businessId,
    type,
    channel,
    recipient_phone: recipientPhone,
    recipient_email: recipientEmail,
    recipient_name: recipientName,
    subject,
    message,
    reference_type: data?.referenceType,
    reference_id: data?.referenceId,
    status: "pending"
  });

  // Send via provider (placeholder - would be implemented with actual APIs)
  try {
    if (channel === "sms" || channel === "whatsapp") {
      const provider = channel === "whatsapp" ? smsProviders.whatsapp : smsProviders.africastalking;
      const result = await provider.send(recipientPhone, message, {});
      
      // Update notification status
      await api.entities.Notification.update(notification.id, {
        status: result.success ? "sent" : "failed",
        sent_at: new Date().toISOString()
      });
    }
  } catch (error) {
    await api.entities.Notification.update(notification.id, {
      status: "failed",
      error_message: error.message
    });
  }

  return notification;
}

// Convenience functions
export async function sendWashReadyNotification(wash, business) {
  if (!wash.customer_phone) return null;
  
  return sendNotification({
    businessId: wash.business_id,
    type: "wash_ready",
    channel: "whatsapp",
    recipientPhone: wash.customer_phone,
    recipientName: wash.customer_name,
    data: {
      customerName: wash.customer_name,
      vehiclePlate: wash.plate_number,
      businessName: business?.name,
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
    channel: "whatsapp",
    recipientPhone: wash.customer_phone,
    recipientName: wash.customer_name,
    data: {
      customerName: wash.customer_name,
      vehiclePlate: wash.plate_number,
      amount: payment.amount,
      mpesaRef: payment.mpesa_receipt,
      referenceType: "payment",
      referenceId: payment.id
    }
  });
}

export async function sendLowStockAlert(item, business, recipientPhone) {
  return sendNotification({
    businessId: item.business_id,
    type: "low_stock",
    channel: "whatsapp",
    recipientPhone,
    data: {
      businessName: business?.name,
      itemName: item.item_name,
      currentQty: item.quantity,
      unit: item.unit,
      threshold: item.low_stock_threshold,
      supplierName: item.supplier_name,
      referenceType: "inventory",
      referenceId: item.id
    }
  });
}

export async function sendShiftReminder(schedule, staff, business) {
  if (!staff?.phone) return null;
  
  return sendNotification({
    businessId: schedule.business_id,
    type: "shift_reminder",
    channel: "whatsapp",
    recipientPhone: staff.phone,
    recipientName: staff.name,
    data: {
      staffName: staff.name,
      businessName: business?.name,
      shiftStart: schedule.shift_start,
      shiftEnd: schedule.shift_end,
      bay: schedule.bay_assignment,
      referenceType: "schedule",
      referenceId: schedule.id
    }
  });
}

export async function updateLoyaltyAndNotify(customer, pointsEarned, business) {
  const newPoints = (customer.points || 0) + pointsEarned;
  const newTier = calculateTier(newPoints);
  
  await api.entities.LoyaltyCustomer.update(customer.id, {
    points: newPoints,
    tier: newTier
  });

  if (customer.sms_opt_in) {
    return sendNotification({
      businessId: customer.business_id,
      type: "loyalty_update",
      channel: "whatsapp",
      recipientPhone: customer.phone,
      recipientName: customer.name,
      data: {
        customerName: customer.name,
        totalPoints: newPoints,
        tier: newTier,
        nextReward: getNextReward(newPoints)
      }
    });
  }
}

function calculateTier(points) {
  if (points >= 10000) return "platinum";
  if (points >= 5000) return "gold";
  if (points >= 1000) return "silver";
  return "bronze";
}

function getNextReward(points) {
  if (points < 500) return `${500 - points} more points for a free interior vacuum!`;
  if (points < 1000) return `${1000 - points} more points for Silver tier!`;
  return "";
}

export default {
  sendNotification,
  notifyInApp,
  sendWashReadyNotification,
  sendPaymentConfirmation,
  sendLowStockAlert,
  sendShiftReminder,
  updateLoyaltyAndNotify,
  templates
};