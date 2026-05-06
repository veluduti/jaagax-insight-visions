/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
  token?: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  token,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your JAAGA X verification code: {token}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brand}>JAAGA X</Text>
        </Section>
        <Heading style={h1}>Verify your email</Heading>
        <Text style={text}>
          Welcome to{' '}
          <Link href={siteUrl} style={link}>
            <strong>JAAGA X</strong>
          </Link>
          ! Use the 6-digit code below to confirm{' '}
          <strong>{recipient}</strong> and finish creating your account.
        </Text>

        <Section style={codeBox}>
          <Text style={codeStyle}>{token}</Text>
          <Text style={codeLabel}>This code expires in 60 minutes</Text>
        </Section>

        <Text style={footer}>
          If you didn't create a JAAGA X account, you can safely ignore this email.
        </Text>
        <Text style={brandFooter}>— Team JAAGA X</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px' }
const brandBar = { marginBottom: '24px' }
const brand = {
  fontSize: '14px',
  fontWeight: 700 as const,
  letterSpacing: '0.18em',
  color: 'hsl(152, 76%, 35%)',
  margin: 0,
}
const h1 = {
  fontSize: '24px',
  fontWeight: 700 as const,
  color: 'hsl(222, 47%, 12%)',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: 'hsl(215, 16%, 36%)',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const link = { color: 'hsl(152, 76%, 35%)', textDecoration: 'none' }
const codeBox = {
  textAlign: 'center' as const,
  backgroundColor: 'hsl(152, 76%, 96%)',
  border: '1px solid hsl(152, 76%, 80%)',
  borderRadius: '16px',
  padding: '24px 16px',
  margin: '0 0 28px',
}
const codeStyle = {
  fontFamily: "'Courier New', monospace",
  fontSize: '36px',
  fontWeight: 700 as const,
  letterSpacing: '0.4em',
  color: 'hsl(152, 76%, 30%)',
  margin: '0 0 8px',
}
const codeLabel = {
  fontSize: '12px',
  color: 'hsl(215, 16%, 46%)',
  margin: 0,
}
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 56%)', margin: '24px 0 8px' }
const brandFooter = { fontSize: '12px', color: 'hsl(152, 76%, 35%)', fontWeight: 600 as const, margin: 0 }
