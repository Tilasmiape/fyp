import nodemailer from 'nodemailer';

type ReviewDecision = 'approved' | 'rejected';

interface AccountReviewEmailInput {
  to: string;
  fullName: string;
  decision: ReviewDecision;
}

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendChoreographerReviewEmail({
  to,
  fullName,
  decision,
}: AccountReviewEmailInput): Promise<{ sent: boolean; reason?: string }> {
  try {
    const isApproved = decision === 'approved';
    
    const subject = isApproved
      ? 'Your choreographer account has been approved'
      : 'Your choreographer signup request was rejected';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <h2 style="color: #1f2937; margin-bottom: 16px;">Hello ${fullName},</h2>
        ${isApproved 
          ? `<p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
               Congratulations! Your choreographer signup request has been <strong>approved</strong> by the Step Out Studio admin team. 
               You can now sign in to your account and start accepting bookings from clients.
             </p>`
          : `<p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
               Your choreographer signup request has been reviewed and unfortunately was <strong>not approved</strong> at this time. 
               Please review your profile information and try again, or contact support for more details.
             </p>`
        }
        <p style="color: #374151; line-height: 1.6; margin-bottom: 16px;">
          ${isApproved 
            ? 'Visit your dashboard to view your profile, set availability, and upload dance videos.' 
            : 'If you have any questions, please feel free to contact us.'}
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          Best regards,<br/>
          <strong>Step Out Studio</strong><br/>
          <a href="https://stepoutstudio.com" style="color: #3b82f6; text-decoration: none;">Visit our website</a>
        </p>
      </div>
    `;

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('   To:', to);
    console.log('   Subject:', subject);
    console.log('   Message ID:', info.messageId);
    
    return { sent: true };
  } catch (error: any) {
    console.error('❌ Email sending failed:', error.message);
    return { sent: false, reason: error.message };
  }
}
