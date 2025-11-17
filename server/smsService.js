// SMS Service Module
// Handles SMS integration for OTP and notifications using various SMS providers

let smsSettings = {
  enabled: false,
  provider: "twilio", // "twilio", "aws-sns", "messagebird", "nexmo"
  apiKey: "",
  apiSecret: "",
  phoneNumber: "", // Sender phone number
  credits: 100, // Paid credits for SMS
  used: 0
};

// SMS Provider configurations
const SMS_PROVIDERS = {
  twilio: {
    baseUrl: "https://api.twilio.com/2010-04-01",
    sendEndpoint: "/Accounts/{accountSid}/Messages.json",
    authType: "basic"
  },
  "aws-sns": {
    baseUrl: "https://sns.{region}.amazonaws.com",
    sendEndpoint: "/",
    authType: "aws"
  },
  messagebird: {
    baseUrl: "https://rest.messagebird.com",
    sendEndpoint: "/messages",
    authType: "bearer"
  },
  nexmo: {
    baseUrl: "https://rest.nexmo.com",
    sendEndpoint: "/sms/json",
    authType: "basic"
  }
};

/**
 * Send an SMS message using configured provider
 * @param {string} phone - Recipient phone number
 * @param {string} message - Message content
 * @returns {Promise<{success: boolean, message?: string, result?: any}>}
 */
async function sendSmsMessage(phone, message) {
  if (!smsSettings.enabled || !smsSettings.apiKey || !smsSettings.phoneNumber) {
    console.log("SMS not configured or disabled");
    return { success: false, message: "SMS not configured" };
  }

  if (smsSettings.used >= smsSettings.credits) {
    console.log("SMS credits exhausted");
    return { success: false, message: "Credits exhausted" };
  }

  try {
    const provider = SMS_PROVIDERS[smsSettings.provider];
    if (!provider) {
      return { success: false, message: "Invalid SMS provider" };
    }

    let response;
    const headers = {
      'Content-Type': 'application/json'
    };

    switch (smsSettings.provider) {
      case 'twilio':
        response = await fetch(`${provider.baseUrl}${provider.sendEndpoint.replace('{accountSid}', smsSettings.apiKey)}`, {
          method: 'POST',
          headers: {
            ...headers,
            'Authorization': `Basic ${Buffer.from(`${smsSettings.apiKey}:${smsSettings.apiSecret}`).toString('base64')}`
          },
          body: JSON.stringify({
            To: phone,
            From: smsSettings.phoneNumber,
            Body: message
          })
        });
        break;

      case 'messagebird':
        response = await fetch(`${provider.baseUrl}${provider.sendEndpoint}`, {
          method: 'POST',
          headers: {
            ...headers,
            'Authorization': `AccessKey ${smsSettings.apiKey}`
          },
          body: JSON.stringify({
            originator: smsSettings.phoneNumber,
            recipients: [phone],
            body: message
          })
        });
        break;

      case 'nexmo':
        response = await fetch(`${provider.baseUrl}${provider.sendEndpoint}`, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({
            api_key: smsSettings.apiKey,
            api_secret: smsSettings.apiSecret,
            to: phone,
            from: smsSettings.phoneNumber,
            text: message
          })
        });
        break;

      default:
        return { success: false, message: "Unsupported SMS provider" };
    }

    const result = await response.json();

    if (response.ok) {
      smsSettings.used++;
      console.log(`SMS sent to ${phone} via ${smsSettings.provider}, credits used: ${smsSettings.used}/${smsSettings.credits}`);
      return { success: true, result };
    } else {
      console.error("SMS API error:", result);
      return { success: false, message: result.error?.message || result.message || "API error" };
    }
  } catch (error) {
    console.error("SMS send error:", error);
    return { success: false, message: error.message };
  }
}

/**
 * Get current SMS settings
 * @returns {Object} SMS settings
 */
function getSmsSettings() {
  return { ...smsSettings };
}

/**
 * Update SMS settings
 * @param {Object} newSettings - New settings to apply
 * @param {boolean} [newSettings.enabled] - Enable/disable SMS
 * @param {string} [newSettings.provider] - SMS provider ("twilio", "aws-sns", "messagebird", "nexmo")
 * @param {string} [newSettings.apiKey] - API key
 * @param {string} [newSettings.apiSecret] - API secret (for providers that need it)
 * @param {string} [newSettings.phoneNumber] - Sender phone number
 */
function updateSmsSettings(newSettings) {
  if (typeof newSettings.enabled === 'boolean') smsSettings.enabled = newSettings.enabled;
  if (newSettings.provider && SMS_PROVIDERS[newSettings.provider]) smsSettings.provider = newSettings.provider;
  if (newSettings.apiKey !== undefined) smsSettings.apiKey = newSettings.apiKey;
  if (newSettings.apiSecret !== undefined) smsSettings.apiSecret = newSettings.apiSecret;
  if (newSettings.phoneNumber !== undefined) smsSettings.phoneNumber = newSettings.phoneNumber;
  console.log("SMS settings updated:", {
    enabled: smsSettings.enabled,
    provider: smsSettings.provider,
    hasApiKey: !!smsSettings.apiKey,
    phoneNumber: smsSettings.phoneNumber
  });
}

/**
 * Send OTP via SMS
 * @param {string} phone - Phone number to send OTP to
 * @param {string} code - OTP code
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function sendOtpViaSms(phone, code) {
  const message = `Your OTP for Cafe Management System is: ${code}. This code will expire in 5 minutes.`;
  return await sendSmsMessage(phone, message);
}

/**
 * Send bill notification via SMS
 * @param {string} phone - Customer phone number
 * @param {Object} bill - Bill details
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function sendBillNotificationViaSms(phone, bill) {
  const message = `Bill Generated! Customer: ${bill.customerName}, Table: ${bill.tableNumber || 'N/A'}, Total: ₹${bill.total}. Thank you for dining with us!`;
  return await sendSmsMessage(phone, message);
}

/**
 * Get available SMS providers
 * @returns {string[]} Array of available provider names
 */
function getAvailableSmsProviders() {
  return Object.keys(SMS_PROVIDERS);
}

module.exports = {
  sendSmsMessage,
  getSmsSettings,
  updateSmsSettings,
  sendOtpViaSms,
  sendBillNotificationViaSms,
  getAvailableSmsProviders
};