import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string; eventTitle?: string; kind?: 'rescheduled' | 'cancelled' | 'deleted'
  oldWhen?: string; newWhen?: string; venue?: string; reason?: string; refund?: boolean; link?: string
}

const heading = (k?: string) => k === 'rescheduled' ? 'Event rescheduled' : k === 'deleted' ? 'Event removed' : 'Event cancelled'

const Email = ({ name, eventTitle, kind, oldWhen, newWhen, venue, reason, refund, link }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{heading(kind)}: {eventTitle || ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>JAAGA X</Text>
        <Heading style={h1}>{heading(kind)}</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'} there is an update about <b>{eventTitle || 'your event'}</b>.</Text>
        <Section style={box}>
          {kind === 'rescheduled' ? (<>
            <Text style={text}><b>Earlier:</b> {oldWhen}</Text>
            <Text style={text}><b>New date & time:</b> {newWhen}</Text>
            {venue ? <Text style={text}><b>Venue:</b> {venue}</Text> : null}
            <Text style={text}>Your booking stays valid for the new date.</Text>
          </>) : (<>
            <Text style={text}>This event will no longer take place{oldWhen ? ` on ${oldWhen}` : ''}. Your booking has been cancelled.</Text>
            {refund ? <Text style={text}>Your payment will be refunded by our team.</Text> : null}
          </>)}
          {reason ? <Text style={text}><b>Note from organizer:</b> {reason}</Text> : null}
        </Section>
        {link ? <Button href={link} style={btn}>View booking</Button> : null}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `${heading(d.kind)}: ${d.eventTitle || 'your event'}`,
  displayName: 'Event changed (reschedule / cancel)',
  previewData: { name: 'Priya', eventTitle: 'Sky Residences Preview', kind: 'rescheduled', oldWhen: '25 Oct 2026, 10:30', newWhen: '1 Nov 2026, 11:00', venue: 'HITEC City', reason: 'Venue availability' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const brand = { color: '#10b981', fontWeight: 700, letterSpacing: '2px', fontSize: '14px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '8px 0 16px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '22px', margin: '4px 0' }
const box = { backgroundColor: '#f1f5f9', borderRadius: '10px', padding: '12px 16px', margin: '16px 0' }
const btn = { backgroundColor: '#10b981', color: '#ffffff', padding: '10px 18px', borderRadius: '8px', fontSize: '14px', textDecoration: 'none' }
