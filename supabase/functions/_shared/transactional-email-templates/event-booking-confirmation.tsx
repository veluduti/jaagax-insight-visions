import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text, Row, Column } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string; eventTitle?: string; eventDate?: string; startTime?: string; endTime?: string
  venue?: string; address?: string; ticketName?: string; quantity?: number; reference?: string
  paid?: boolean; unitPrice?: number; total?: number; paymentId?: string; benefits?: string[]; link?: string
}
const inr = (n?: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const R = ({ k, v }: { k: string; v?: React.ReactNode }) => (
  <Row><Column><Text style={muted}>{k}</Text></Column><Column align="right"><Text style={text}><b>{v ?? '—'}</b></Text></Column></Row>
)

const Email = (p: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your booking for {p.eventTitle || 'the event'} is confirmed — {p.reference || ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>JAAGA X</Text>
        <Heading style={h1}>Booking confirmed</Heading>
        <Text style={text}>{p.name ? `Hi ${p.name},` : 'Hi there,'} your registration is confirmed. Show this booking reference at the venue.</Text>
        <Section style={box}>
          <Text style={{ ...text, fontSize: '16px' }}><b>{p.eventTitle || 'Event'}</b></Text>
          <Text style={muted}>{p.eventDate}{p.startTime ? ` · ${p.startTime}` : ''}{p.endTime ? ` – ${p.endTime}` : ''}</Text>
          <Text style={muted}>{p.venue}{p.address ? `, ${p.address}` : ''}</Text>
        </Section>
        <R k="Booking reference" v={p.reference} />
        <R k="Ticket" v={p.ticketName} />
        <R k="Quantity" v={p.quantity} />
        {p.paid ? (<>
          <R k="Price per ticket" v={inr(p.unitPrice)} />
          <Hr />
          <R k="Total paid" v={inr(p.total)} />
          {p.paymentId ? <R k="Payment ID" v={p.paymentId} /> : null}
        </>) : <R k="Payment" v="Free — no payment needed" />}
        {p.benefits && p.benefits.length > 0 ? (
          <Section style={{ marginTop: '12px' }}>
            <Text style={text}><b>Your benefits</b></Text>
            {p.benefits.map((b, i) => <Text key={i} style={muted}>• {b}</Text>)}
          </Section>
        ) : null}
        {p.link ? <Button href={p.link} style={btn}>View booking</Button> : null}
        <Text style={muted}>Need help? Reply to this email and our team will assist you.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Booking confirmed · ${d.eventTitle || 'Event'} (${d.reference || ''})`,
  displayName: 'Event booking confirmation',
  previewData: { name: 'Ravi', eventTitle: 'Sunrise Towers Launch', eventDate: '20 Nov 2026', startTime: '10:00', endTime: '13:00', venue: 'Sunrise Towers Site Office', address: 'Kokapet, Hyderabad', ticketName: 'VIP Pass', quantity: 2, reference: 'EVT-1A2B3C4D', paid: true, unitPrice: 999, total: 1998, paymentId: 'pay_123', benefits: ['Front-row seating', 'Site tour with builder'], link: 'https://jaagax.com/events/my-bookings' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const brand = { color: '#059669', fontWeight: 700, letterSpacing: '2px', fontSize: '14px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '8px 0' }
const text = { fontSize: '14px', color: '#0f172a', margin: '4px 0' }
const muted = { fontSize: '13px', color: '#475569', margin: '4px 0' }
const box = { background: '#f0fdf4', borderRadius: '8px', padding: '12px 16px', margin: '16px 0' }
const btn = { background: '#059669', color: '#ffffff', padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, margin: '16px 0' }
