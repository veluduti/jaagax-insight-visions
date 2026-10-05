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

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to JAAGA X</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>JAAGA X</Text>
        <Heading style={h1}>You've been invited</Heading>
        <Text style={text}>
          Click the button below to accept your invitation and create your JAAGA X account.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
          <Button style={button} href={confirmationUrl}>
            Accept Invitation
          </Button>
        </Section>
        <Text style={footer}>
          If you weren't expecting this invitation, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '480px' }
const brand = { fontSize: '14px', fontWeight: 700 as const, letterSpacing: '0.18em', color: 'hsl(152, 76%, 35%)', margin: '0 0 24px' }
const h1 = { fontSize: '24px', fontWeight: 700 as const, color: 'hsl(222, 47%, 12%)', margin: '0 0 16px' }
const text = { fontSize: '15px', color: 'hsl(215, 16%, 36%)', lineHeight: '1.6', margin: '0 0 24px' }
const button = { backgroundColor: 'hsl(152, 76%, 45%)', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 56%)', margin: '24px 0 0' }
