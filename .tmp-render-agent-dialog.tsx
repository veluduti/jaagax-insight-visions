;(globalThis as any).localStorage = {
  getItem() { return null; },
  setItem() {},
  removeItem() {},
  clear() {},
  key() { return null; },
  length: 0,
};
import React from 'react';
import { renderToString } from 'react-dom/server';
const { default: AgentEditPropertyDialog } = await import('@/components/agents/AgentEditPropertyDialog');

const property = {
  id: '7736bd45-bf95-47f3-bc52-b996ce718517',
  title: '3 BHK Flat for Sale in kukatpally, Hyderabad — 1250 sq ft',
  city: 'Hyderabad',
  locality: 'kukatpally',
  address: null,
  pincode: null,
  price: 15000000,
  price_negotiable: false,
  maintenance_charges: null,
  booking_amount: null,
  area_sqft: 1250,
  building_area_sqft: null,
  bhk: 3,
  bedrooms: 3,
  bathrooms: null,
  balconies: null,
  floor_number: 3,
  total_floors: 10,
  type: 'Apartment / Flat',
  listing_type: 'sale',
  listed_by: 'owner',
  rera_id: null,
  rera_document_url: null,
  furnishing: null,
  completion_stage: 'Ready',
  property_age: null,
  total_parking: null,
  amenities: ['Clubhouse', 'Park', 'Security'],
  images: [],
  video_urls: [],
  description: null,
  submitted_by: 'fe70e223-9bc3-46a9-8a6b-d09be2139a25',
  original_snapshot: null,
  agent_data: null,
  field_verification: null,
  agent_notes: null,
};

const html = renderToString(
  <AgentEditPropertyDialog
    open={true}
    onOpenChange={() => {}}
    property={property}
    agentName="Vikram Patel"
    agentId="9772549f-6c81-4966-aa55-9d7a25437693"
    agentUserId="user-1"
    onSubmitted={() => {}}
  />
);
console.log('render ok', html.length);
