import { Resend } from "resend";

const sendEmail = async (options) => {
  // Environment validation
  const apiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured."
    );
  }

  if (!emailFrom) {
    throw new Error(
      "EMAIL_FROM is not configured."
    );
  }

  // Payload validation
  if (
    !options?.to ||
    !options?.subject ||
    !options?.html
  ) {
    throw new Error(
      "Invalid email payload."
    );
  }

  try {
    const resend = new Resend(apiKey);

    const { data, error } =
      await resend.emails.send({
        from: emailFrom,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      });

    // Resend API error
    if (error) {
      console.error(
        "RESEND ERROR:",
        JSON.stringify(error, null, 2)
      );

      throw new Error(
        error.message ||
          "Resend email sending failed."
      );
    }

    // Safety check
    if (!data?.id) {
      throw new Error(
        "Resend did not return an email ID."
      );
    }

    console.log(
      `Email sent successfully: ${data.id}`
    );

    return data;
  } catch (error) {
    console.error(
      "EMAIL ERROR:",
      error?.message || error
    );

    throw error;
  }
};

export default sendEmail;