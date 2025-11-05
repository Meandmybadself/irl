import { MailerSend, EmailParams, Recipient, Sender } from 'mailersend'

let mailerSendClient: MailerSend | null = null

const getMailerSendClient = () => {
  if (mailerSendClient) {
    return mailerSendClient
  }

  const apiKey = process.env.MAILERSEND_API_TOKEN
  if (!apiKey) {
    return null
  }

  mailerSendClient = new MailerSend({ apiKey })
  return mailerSendClient
}

const resolveFromAddress = () => {
  return process.env.MAILERSEND_FROM_EMAIL ?? process.env.EMAIL_FROM_ADDRESS ?? null
}

const resolveFromName = () => {
  return process.env.MAILERSEND_FROM_NAME ?? process.env.EMAIL_FROM_NAME ?? undefined
}

const resolveVerificationBaseUrl = () => {
  return (
    process.env.CLIENT_URL ||
    'http://localhost:3000'
  )
}

export const buildVerificationLink = (token: string, type: 'verify-email' | 'verify-email-change' = 'verify-email') => {
  const verificationPath = type === 'verify-email-change' ? '/verify-email-change' : '/verify-email'
  const url = new URL(verificationPath, resolveVerificationBaseUrl())
  url.searchParams.set('token', token)
  return url.toString()
}

export const sendVerificationEmail = async (email: string, token: string, type: 'verify-email' | 'verify-email-change' = 'verify-email') => {
  const client = getMailerSendClient()
  const fromAddress = resolveFromAddress()

  if (!client || !fromAddress) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('MailerSend not configured - skipping verification email dispatch.')
    }
    return
  }

  const verificationLink = buildVerificationLink(token, type)
  const sender = new Sender(fromAddress, resolveFromName())
  const recipients = [new Recipient(email)]

  const isEmailChange = type === 'verify-email-change'
  const subject = isEmailChange ? 'Verify your new email address' : 'Verify your IRL account email'
  const message = isEmailChange
    ? 'Please confirm your new email address to complete the change.'
    : 'Please confirm your email address to complete your IRL account setup.'

  const params = new EmailParams()
    .setFrom(sender)
    .setTo(recipients)
    .setSubject(subject)
    .setText([
      'Hi there!',
      message,
      `Verification link: ${verificationLink}`,
      `If you did not request this ${isEmailChange ? 'email change' : 'account'}, you can ignore this message.`
    ].join('\n\n'))
    .setHtml(`
      <p>Hi there!</p>
      <p>${message}</p>
      <p><a href="${verificationLink}">Verify your email address</a></p>
      <p>If you did not request this ${isEmailChange ? 'email change' : 'account'}, you can ignore this message.</p>
    `)

  const response = await client.email.send(params)
  return response
}
