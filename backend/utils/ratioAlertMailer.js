import nodemailer from 'nodemailer';

const getMailerConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    from,
  };
};

export const sendRatioAlertEmail = async ({
  to,
  ratioName,
  ratioValuePercent,
  thresholdPercent,
  condition,
  part1Label,
  part2Label,
  watchedPartLabel,
}) => {
  const config = getMailerConfig();
  if (!config) {
    return { sent: false, reason: 'missing_smtp_config' };
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const conditionText = condition === 'above' ? 'above' : 'below';

  await transporter.sendMail({
    from: config.from,
    to,
    subject: `Ratio Alert: ${ratioName}`,
    text: [
      `Your saved ratio alert was triggered.`,
      ``,
      `Ratio: ${ratioName}`,
      `${watchedPartLabel} / (${part1Label} + ${part2Label}): ${ratioValuePercent.toFixed(2)}%`,
      `Alert condition: ${conditionText} ${thresholdPercent.toFixed(2)}%`,
      ``,
      `This email was sent by your portfolio tracker ratio alert.`,
    ].join('\n'),
  });

  return { sent: true };
};
