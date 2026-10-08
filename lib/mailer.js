import nodemailer from "nodemailer";

const ADMIN = (process.env.ADMIN_EMAIL || "lumenomore@hotmail.com").toLowerCase();

function transporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) throw new Error("SMTP is not configured. Set SMTP_USER and SMTP_PASS in Vercel.");
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

function fromAddress() {
  const email = process.env.SMTP_FROM || process.env.SMTP_USER;
  const name = process.env.SMTP_FROM_NAME || "Dbweb";
  return email ? { name, address: email } : "Dbweb";
}

export async function sendAdminNewPayment({ paymentId, email, planDays, amount, receiptName, receiptBuffer, receiptType }) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const adminUrl = site ? site + "/admin" : "/admin";
  await transporter().sendMail({
    from: fromAddress(),
    to: ADMIN,
    subject: `Dbweb — New payment #${paymentId} needs approval`,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2>New Dbweb payment</h2>
      <p>A user has submitted a subscription payment and it needs your review.</p>
      <p><b>Payment:</b> #${paymentId}<br>
      <b>User:</b> ${escapeHtml(email)}<br>
      <b>Plan:</b> ${planDays} day(s)<br>
      <b>Amount:</b> ₹${amount}</p>
      <p>The receipt is attached to this email.</p>
      <p><a href="${adminUrl}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px">Open Dbweb Admin</a></p>
    </div>`,
    attachments: receiptBuffer ? [{ filename: receiptName || "payment-receipt", content: receiptBuffer, contentType: receiptType || undefined }] : []
  });
}

export async function sendUserPaymentResult({ email, paymentId, status, planDays, amount }) {
  const approved = status === "approved";
  await transporter().sendMail({
    from: fromAddress(),
    to: email,
    subject: approved ? "Dbweb — Subscription approved" : "Dbweb — Payment rejected",
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2>Dbweb</h2>
      <p>${approved ? "Your payment has been approved and your subscription is now active." : "Your payment was rejected after review."}</p>
      <p><b>Payment:</b> #${paymentId}<br><b>Plan:</b> ${planDays} day(s)<br><b>Amount:</b> ₹${amount}</p>
      ${approved ? "<p>You can now use your Dbweb subscription.</p>" : "<p>Please check your payment/receipt and contact support if you believe this was a mistake.</p>"}
    </div>`
  });
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
