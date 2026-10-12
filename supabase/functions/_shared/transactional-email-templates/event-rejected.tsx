import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; eventTitle?: string; reason?: string; link?: string }

const Email = ({ name, eventTitle, reason, link }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your event "{eventTitle || ''}" needs changes before it can go live</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>JAAGA X</Text>
        <Heading style={h1}>Event not approved</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'} our team reviewed <b>{eventTitle || 'your event'}</b> and could not approve it yet.</Text>
        <Section style={box}>
          <Text style={text}><b>Reason</b></Text>
          <Text style={text}>{reason || 'No reason was given.'}</Text>
        </Section>
        <Text style={text}>You can edit the event and submit it again for approval.</Text>
        {link ? <Button href={link} style={btn}>Edit event</Button> : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Event not approved · ${d.eventTitle || 'Your event'}`,
  displayName: 'Event rejected',
  previewData: { name: 'Suresh', eventTitle: 'Sunrise Towers Launch', reason: 'Please add the venue address and a clear event image.', link: 'https://jaagax.com/events/manage' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const brand = { color: '#059669', fontWeight: 700, letterSpacing: '2px', fontSize: '14px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '8px 0' }
const text = { fontSize: '14px', color: '#0f172a', margin: '4px 0' }
const box = { background: '#fef2f2', borderRadius: '8px', padding: '12px 16px', margin: '16px 0' }
const btn = { background: '#059669', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, margin: '16px 0' }
