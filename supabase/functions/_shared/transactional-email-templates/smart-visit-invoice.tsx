import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Row, Column } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Line { label: string; amount: number }
interface Props {
  name?: string; invoiceNo?: string; paidOn?: string; planTitle?: string; visitDate?: string; startTime?: string
  meetingPoint?: string; lines?: Line[]; total?: number; paymentId?: string
}
const inr = (n?: number) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const Email = ({ name, invoiceNo, paidOn, planTitle, visitDate, startTime, meetingPoint, lines = [], total, paymentId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Smart Visit is booked — invoice {invoiceNo || ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>JAAGA X</Text>
        <Heading style={h1}>Booking confirmed</Heading>
        <Text style={text}>{name ? `Hi ${name},` : 'Hi there,'} thanks for your payment. Your Smart Visit seat is confirmed.</Text>
        <Section style={box}>
          <Text style={text}><b>{planTitle || 'Smart Visit'}</b></Text>
          <Text style={muted}>{visitDate}{startTime ? ` · ${startTime}` : ''}{meetingPoint ? ` · ${meetingPoint}` : ''}</Text>
        </Section>
        <Heading as="h2" style={h2}>Invoice {invoiceNo}</Heading>
        <Text style={muted}>Paid on {paidOn}{paymentId ? ` · Payment ID ${paymentId}` : ''}</Text>
        {lines.map((l, i) => (
          <Row key={i}><Column><Text style={text}>{l.label}</Text></Column><Column align="right"><Text style={text}>{inr(l.amount)}</Text></Column></Row>
        ))}
        <Hr />
        <Row><Column><Text style={text}><b>Total paid</b></Text></Column><Column align="right"><Text style={text}><b>{inr(total)}</b></Text></Column></Row>
        <Text style={muted}>Your agent will contact you before the visit. Keep this email as your receipt.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Smart Visit booked — Invoice ${d.invoiceNo || ''}`,
  displayName: 'Smart Visit invoice',
  previewData: { name: 'Ravi', invoiceNo: 'SV-1A2B3C4D', paidOn: '9 Oct 2026', planTitle: 'KPHB Weekend 3 BHK Tour', visitDate: '18 Oct 2026', startTime: '10:00', meetingPoint: 'KPHB Metro', lines: [{ label: 'Meeting point × 2', amount: 1200 }, { label: 'Veg lunch × 2', amount: 400 }], total: 1600, paymentId: 'pay_123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const brand = { color: '#059669', fontWeight: 700, letterSpacing: '2px', fontSize: '14px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '8px 0' }
const h2 = { fontSize: '16px', color: '#0f172a', margin: '20px 0 4px' }
const text = { fontSize: '14px', color: '#0f172a', margin: '4px 0' }
const muted = { fontSize: '12px', color: '#64748b', margin: '4px 0' }
const box = { background: '#ecfdf5', borderRadius: '8px', padding: '12px 14px' }
