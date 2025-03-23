const nodemailer = require("nodemailer");

async function main() {
  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: "rozella.heaney@ethereal.email",  // Use the full Ethereal email address
      pass: "Ucc64uTmcnmxUS3ECq"             // Replace with your actual Ethereal password
    }
  });

  let info = await transporter.sendMail({
    from: '"Test" <forrest.parker7@ethereal.email>',
    to: "test@example.com",
    subject: "Hello from Ethereal",
    text: "Hello world?"
  });

  console.log("Message sent: %s", info.messageId);
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
}

main().catch(console.error);
