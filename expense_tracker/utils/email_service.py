"""
Email Alert Service
Sends budget-exceeded and anomaly notifications via SMTP (Gmail).

Uses Python's built-in smtplib with HTML email templates.
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from config import settings


def send_budget_alert_email(
    to_email: str,
    user_name: str,
    category: str,
    spent: float,
    limit: float,
    percentage: float
):
    """
    Send a budget alert email when the user's spending approaches or exceeds their limit.

    Parameters
    ----------
    to_email   : Recipient email address
    user_name  : User's display name
    category   : Budget category (e.g. 'Food' or 'Overall')
    spent      : Amount spent so far
    limit      : Budget limit
    percentage : Percentage of budget used
    """
    subject = (
        f"🚨 Budget {'Exceeded' if percentage >= 100 else 'Warning'} – {category} ({percentage:.0f}% used)"
    )

    status_color = "#ef4444" if percentage >= 100 else "#f59e0b"
    status_text  = "exceeded" if percentage >= 100 else "approaching its limit"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px;">
      <div style="max-width: 520px; margin: auto; background: #fff; border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">

        <!-- Header -->
        <div style="background: {status_color}; padding: 24px 32px;">
          <h2 style="color: #fff; margin: 0; font-size: 20px;">
            {'🚨 Budget Exceeded!' if percentage >= 100 else '⚠️ Budget Warning'}
          </h2>
        </div>

        <!-- Body -->
        <div style="padding: 28px 32px;">
          <p style="font-size: 16px; color: #1e293b;">Hi <strong>{user_name}</strong>,</p>
          <p style="color: #475569;">
            Your <strong>{category}</strong> budget has {status_text}.
          </p>

          <!-- Stats -->
          <div style="background: #f1f5f9; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Category</td>
                <td style="padding: 6px 0; font-weight: 600; color: #1e293b; text-align: right;">{category}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Amount Spent</td>
                <td style="padding: 6px 0; font-weight: 600; color: {status_color}; text-align: right;">₹{spent:,.2f}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Budget Limit</td>
                <td style="padding: 6px 0; font-weight: 600; color: #1e293b; text-align: right;">₹{limit:,.2f}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-size: 14px;">Used</td>
                <td style="padding: 6px 0; font-weight: 700; color: {status_color}; text-align: right;">{percentage:.1f}%</td>
              </tr>
            </table>
          </div>

          <!-- Progress bar -->
          <div style="background: #e2e8f0; border-radius: 99px; height: 10px; overflow: hidden;">
            <div style="width: {min(percentage, 100):.0f}%; background: {status_color}; height: 100%; border-radius: 99px;"></div>
          </div>

          <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
            {'Consider reducing your spending for the rest of this month.' if percentage < 100 else
             'You have already exceeded your limit. Review your recent transactions.'}
          </p>

          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            Sent by <strong>Smart Expense Tracker</strong> &nbsp;|&nbsp; {datetime.now().strftime("%d %b %Y, %I:%M %p")}
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    _send_email(to_email, subject, html_body)


def send_anomaly_alert_email(
    to_email: str,
    user_name: str,
    category: str,
    amount: float,
    mean_amount: float,
    z_score: float,
    description: str = ""
):
    """Send an email when an anomalous (unusually large) transaction is detected."""
    subject = f"🔍 Unusual Spending Detected – {category} (₹{amount:,.0f})"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px;">
      <div style="max-width: 520px; margin: auto; background: #fff; border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">
        <div style="background: #7c3aed; padding: 24px 32px;">
          <h2 style="color: #fff; margin: 0;">🔍 Anomaly Detected</h2>
        </div>
        <div style="padding: 28px 32px;">
          <p style="font-size: 16px; color: #1e293b;">Hi <strong>{user_name}</strong>,</p>
          <p style="color: #475569;">
            Our AI detected an unusually high expense in your <strong>{category}</strong> category.
          </p>
          <div style="background: #f5f3ff; border-radius: 8px; padding: 18px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="color: #64748b; font-size: 14px;">Description</td>
                  <td style="font-weight: 600; text-align: right;">{description or 'N/A'}</td></tr>
              <tr><td style="color: #64748b; font-size: 14px; padding-top: 6px;">Amount</td>
                  <td style="font-weight: 700; color: #7c3aed; text-align: right; padding-top: 6px;">₹{amount:,.2f}</td></tr>
              <tr><td style="color: #64748b; font-size: 14px; padding-top: 6px;">Your Avg ({category})</td>
                  <td style="font-weight: 600; text-align: right; padding-top: 6px;">₹{mean_amount:,.2f}</td></tr>
              <tr><td style="color: #64748b; font-size: 14px; padding-top: 6px;">Anomaly Score</td>
                  <td style="font-weight: 700; color: #7c3aed; text-align: right; padding-top: 6px;">{z_score:.2f}σ</td></tr>
            </table>
          </div>
          <p style="color: #64748b; font-size: 14px;">
            If this transaction looks unfamiliar, please review it in your expense tracker dashboard.
          </p>
        </div>
      </div>
    </body>
    </html>
    """
    _send_email(to_email, subject, html_body)


def _send_email(to_email: str, subject: str, html_body: str):
    """
    Internal helper to send HTML email via SMTP.

    BUG 3 FIX: Replaced settings.SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/EMAIL_FROM
               with settings.MAIL_SERVER/MAIL_PORT/MAIL_USERNAME/MAIL_PASSWORD/MAIL_FROM
               to match the actual field names in config.py and .env
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = settings.MAIL_FROM
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html"))

    with smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.sendmail(settings.MAIL_FROM, to_email, msg.as_string())


def send_otp_email(to_email: str, user_name: str, otp: str):
    """Send a 6-digit OTP verification email during registration."""
    subject = "🔐 Your ExpenseIQ Verification Code"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; padding: 20px;">
      <div style="max-width: 480px; margin: auto; background: #fff; border-radius: 14px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden;">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #00d4ff, #7c3aed); padding: 28px 32px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 6px;">💸</div>
          <h2 style="color: #fff; margin: 0; font-size: 20px; font-weight: 800;">ExpenseIQ</h2>
          <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 13px;">Email Verification</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
          <p style="font-size: 15px; color: #1e293b;">Hi <strong>{user_name}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Use the verification code below to complete your registration.
            This code expires in <strong>10 minutes</strong>.
          </p>

          <!-- OTP Box -->
          <div style="background: #f1f5f9; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
            <div style="letter-spacing: 10px; font-size: 38px; font-weight: 900;
                        color: #0f172a; font-family: 'Courier New', monospace;">{otp}</div>
            <div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">6-digit verification code</div>
          </div>

          <p style="color: #94a3b8; font-size: 12px;">
            If you didn't request this, you can safely ignore this email.
          </p>

          <p style="color: #cbd5e1; font-size: 11px; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
            Sent by <strong>Smart Expense Tracker</strong> &nbsp;|&nbsp; {datetime.now().strftime("%d %b %Y, %I:%M %p")}
          </p>
        </div>
      </div>
    </body>
    </html>
    """
    _send_email(to_email, subject, html_body)
