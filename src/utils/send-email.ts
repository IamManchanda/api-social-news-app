import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const sendEmail = async ({ to, subject, html }: EmailOptions) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: "alittyivlkqrkgz5@ethereal.email",
      pass: "3XHaYDqeVhwkbWZ2Q8",
    },
  });
  const info = await transporter.sendMail({
    from: '"Harry Manchanda" <harry@kibanu.com>',
    to,
    subject,
    html,
  });
  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
};
