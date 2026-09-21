import nodemailer from "nodemailer";

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_EMAIL, // Tumar Gmail address
      pass: process.env.SMTP_PASSWORD, // Gmail App Password (Normal password noy)
    },
  });

  const mailOptions = {
    from: `"Afis Creation" <${process.env.SMTP_EMAIL}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendEmail;