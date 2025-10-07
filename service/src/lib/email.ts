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

export const buildVerificationLink = (token: string) => {
  const verificationPath = '/verify-email'
  const url = new URL(verificationPath, resolveVerificationBaseUrl())
  url.searchParams.set('token', token)
  return url.toString()
}

export const sendVerificationEmail = async (email: string, token: string) => {
  const client = getMailerSendClient()
  const fromAddress = resolveFromAddress()

  if (!client || !fromAddress) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('MailerSend not configured - skipping verification email dispatch.')
    }
    return
  }

  const verificationLink = buildVerificationLink(token)
  const sender = new Sender(fromAddress, resolveFromName())
  const recipients = [new Recipient(email)]

  const params = new EmailParams()
    .setFrom(sender)
    .setTo(recipients)
    .setSubject('Verify your IRL account email')
    .setText([
      'Hi there!',
      'Please confirm your email address to complete your IRL account setup.',
      `Verification link: ${verificationLink}`,
      'If you did not request this account, you can ignore this message.'
    ].join('\n\n'))
    .setHtml(`
      <p>Hi there!</p>
      <p>Please confirm your email address to complete your IRL account setup.</p>
      <p><a href="${verificationLink}">Verify your email address</a></p>
      <p>If you did not request this account, you can ignore this message.</p>
    `)

  const response = await client.email.send(params)
  return response
}
