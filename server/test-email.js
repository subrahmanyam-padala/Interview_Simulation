import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const testEmail = async () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  console.log(`Testing with user: ${user}, pass: ${pass ? '****' : 'MISSING'}`);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: user,
      pass: pass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"Test" <${user}>`,
      to: user, // send to self
      subject: "Test Email",
      text: "This is a test email.",
    });
    console.log("Email sent successfully: ", info.response);
  } catch (error) {
    console.error("Failed to send email: ", error);
  }
};

testEmail();
