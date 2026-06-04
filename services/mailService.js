const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendVerificationEmail = async (to, code) => {
  await transporter.sendMail({
    from: process.env.MAIL_USER,
    to,
    subject: '[MOARI] 이메일 인증번호 안내',
    html: `
      <h2>MOARI 이메일 인증번호</h2>
      <p>아래 인증번호를 입력해주세요.</p>
      <h1>${code}</h1>
      <p>본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
    `,
  });
};

module.exports = {
  sendVerificationEmail,
};