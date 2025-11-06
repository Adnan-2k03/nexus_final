import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const isConfigured = !!(
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_REGION
);

if (!isConfigured) {
  console.warn("⚠️  AWS SNS not configured - phone verification will not be available");
  console.warn("   Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION to enable SMS");
}

let snsClient: SNSClient | null = null;

if (isConfigured) {
  snsClient = new SNSClient({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  if (!snsClient) {
    console.error("AWS SNS is not configured. Cannot send SMS.");
    return false;
  }

  try {
    const command = new PublishCommand({
      PhoneNumber: phoneNumber,
      Message: message,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional'
        }
      }
    });

    const response = await snsClient.send(command);
    console.log(`SMS sent successfully to ${phoneNumber}. MessageId: ${response.MessageId}`);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function isPhoneAuthConfigured(): boolean {
  return isConfigured;
}
