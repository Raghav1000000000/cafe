// WhatsApp Service Module
// Handles WhatsApp Business API integration for OTP and notifications

let whatsappSettings = {
  enabled: false,
  apiKey: "",
  phoneNumber: "",
  credits: 1000, // Free tier: 1000 messages/month
  used: 0
};

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

/**
 * Send a WhatsApp message using Business API
 * @param {string} phone - Recipient phone number
 * @param {string} message - Message content
 * @returns {Promise<{success: boolean, message?: string, result?: any}>}
 */
async function sendWhatsappMessage(phone, message) {
  if (!whatsappSettings.enabled || !whatsappSettings.apiKey || !whatsappSettings.phoneNumber) {
    console.log("WhatsApp not configured or disabled");
    return { success: false, message: "WhatsApp not configured" };
  }

  if (whatsappSettings.used >= whatsappSettings.credits) {
    console.log("WhatsApp credits exhausted");
    return { success: false, message: "Credits exhausted" };
  }

  try {
    const response = await fetch(`${WHATSAPP_API_BASE}/${whatsappSettings.phoneNumber}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappSettings.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: message }
      })
    });

    const result = await response.json();

    if (response.ok) {
      whatsappSettings.used++;
      console.log(`WhatsApp message sent to ${phone}, credits used: ${whatsappSettings.used}/${whatsappSettings.credits}`);
      return { success: true, result };
    } else {
      console.error("WhatsApp API error:", result);
      return { success: false, message: result.error?.message || "API error" };
    }
  } catch (error) {
    console.error("WhatsApp send error:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Get current WhatsApp settings
 * @returns {Object} WhatsApp settings
 */
function getWhatsappSettings() {
  return { ...whatsappSettings };
}

/**
 * Update WhatsApp settings
 * @param {Object} newSettings - New settings to apply
 * @param {boolean} [newSettings.enabled] - Enable/disable WhatsApp
 * @param {string} [newSettings.apiKey] - WhatsApp API key
 * @param {string} [newSettings.phoneNumber] - WhatsApp phone number ID
 */
function updateWhatsappSettings(newSettings) {
  if (typeof newSettings.enabled === 'boolean') whatsappSettings.enabled = newSettings.enabled;
  if (newSettings.apiKey !== undefined) whatsappSettings.apiKey = newSettings.apiKey;
  if (newSettings.phoneNumber !== undefined) whatsappSettings.phoneNumber = newSettings.phoneNumber;
  console.log("WhatsApp settings updated:", {
    enabled: whatsappSettings.enabled,
    hasApiKey: !!whatsappSettings.apiKey,
    phoneNumber: whatsappSettings.phoneNumber
  });
}

/**
 * Send OTP via WhatsApp
 * @param {string} phone - Phone number to send OTP to
 * @param {string} code - OTP code
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function sendOtpViaWhatsapp(phone, code) {
  const message = `Your OTP for Cafe Management System is: ${code}. This code will expire in 5 minutes.`;
  return await sendWhatsappMessage(phone, message);
}

/**
 * Send bill notification via WhatsApp
 * @param {string} phone - Customer phone number
 * @param {Object} bill - Bill details
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function sendBillNotificationViaWhatsapp(phone, bill) {
  const message = `Bill Generated!\n\nCustomer: ${bill.customerName}\nTable: ${bill.tableNumber || 'N/A'}\nTotal: ₹${bill.total}\n\nThank you for dining with us!`;
  return await sendWhatsappMessage(phone, message);
}

module.exports = {
  sendWhatsappMessage,
  getWhatsappSettings,
  updateWhatsappSettings,
  sendOtpViaWhatsapp,
  sendBillNotificationViaWhatsapp
};