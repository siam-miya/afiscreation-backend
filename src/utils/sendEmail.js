import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (options) => {
  try {
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: [options.email],
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error("=================================");
      console.error("EMAIL SENDING FAILED");
      console.error("Error:", error);
      console.error("=================================");

      throw new Error(error.message || "Failed to send email");
    }

    console.log("=================================");
    console.log("EMAIL SENT SUCCESSFULLY");
    console.log("To:", options.email);
    console.log("Message ID:", data?.id);
    console.log("=================================");

    return data;
  } catch (error) {
    console.error("=================================");
    console.error("EMAIL SENDING FAILED");
    console.error("Error:", error.message);
    console.error("=================================");

    throw error;
  }
};

export default sendEmail;