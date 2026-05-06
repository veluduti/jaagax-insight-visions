/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
  token?: string
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
  token,
}: EmailChangeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your JAAGA X email change</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>JAAGA X</Text>
        <Heading style={h1}>Confirm your email change</Heading>
        <Text style={text}>
          You requested to change your JAAGA X email from <strong>{oldEmail}</strong> to <strong>{newEmail}</strong>.
        </Text>
        {token && (
          <Section style={codeBox}>
            <Text style={codeStyle}>{token}</Text>
          </Section>
        )}
        <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
          <Button style={button} href={confirmationUrl}>
            Confirm Email Change
          </Button>
        </Section>
        <Text style={footer}>
          If you didn't request this change, please secure your account immediately.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px' }
const brand = { fontSize: '14px', fontWeight: 700 as const, letterSpacing: '0.18em', color: 'hsl(152, 76%, 35%)', margin: '0 0 24px' }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: 'hsl(222, 47%, 12%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(215, 16%, 36%)', lineHeight: '1.6', margin: '0 0 24px' }
const codeBox = { textAlign: 'center' as const, backgroundColor: 'hsl(152, 76%, 96%)', border: '1px solid hsl(152, 76%, 80%)', borderRadius: '16px', padding: '24px 16px', margin: '0 0 20px' }
const codeStyle = { fontFamily: "'Courier New', monospace", fontSize: '36px', fontWeight: 700 as const, letterSpacing: '0.4em', color: 'hsl(152, 76%, 30%)', margin: 0 }
const button = { backgroundColor: 'hsl(152, 76%, 45%)', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 56%)', margin: '24px 0 0' }
