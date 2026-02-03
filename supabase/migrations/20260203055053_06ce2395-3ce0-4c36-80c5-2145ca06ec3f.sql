-- Insert comprehensive property data with trust_score in valid 0-1 range
INSERT INTO public.properties (builder_id, title, description, address, price, property_type, city, locality, bedrooms, bathrooms, area_sqft, verified, active, featured, trust_score, images, latitude, longitude) VALUES
-- Hyderabad Properties
('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Skyline Heights 3BHK', 'Luxurious 3BHK apartment with stunning city views, modern amenities, and premium finishes.', 'Plot 45, Gachibowli Main Road', 12500000, 'apartment', 'Hyderabad', 'Gachibowli', 3, 3, 1850, true, true, true, 0.85, '["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800"]', 17.4401, 78.3489),

('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Green Valley Villa', 'Spacious 4BHK villa with private garden and swimming pool access.', 'Survey 123, Kondapur', 35000000, 'villa', 'Hyderabad', 'Kondapur', 4, 4, 3200, true, true, true, 0.92, '["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800"]', 17.4632, 78.3570),

('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Urban Nest 2BHK', 'Compact 2BHK ideal for young professionals near IT parks.', 'Block C, Madhapur', 6500000, 'apartment', 'Hyderabad', 'Madhapur', 2, 2, 1100, true, true, false, 0.78, '["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"]', 17.4484, 78.3915),

('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Heritage Haveli', 'Traditional 5BHK villa with courtyard and terrace garden.', 'Road 12, Banjara Hills', 55000000, 'villa', 'Hyderabad', 'Banjara Hills', 5, 5, 4500, true, true, true, 0.95, '["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"]', 17.4156, 78.4347),

('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Metro View Apartment', '3BHK with metro connectivity and modular kitchen.', 'Tower B, Miyapur', 9800000, 'apartment', 'Hyderabad', 'Miyapur', 3, 2, 1650, true, true, false, 0.80, '["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800"]', 17.4969, 78.3538),

('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Lake Front Residency', 'Premium 4BHK overlooking Hussain Sagar lake.', 'Plot 78, Khairatabad', 28000000, 'apartment', 'Hyderabad', 'Khairatabad', 4, 4, 2800, true, true, true, 0.88, '["https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800"]', 17.4062, 78.4691),

-- Bangalore Properties
('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Tech Park Towers', 'Modern 3BHK near Electronic City with smart features.', 'Phase 2, Electronic City', 11500000, 'apartment', 'Bangalore', 'Electronic City', 3, 3, 1750, true, true, false, 0.82, '["https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800"]', 12.8456, 77.6603),

('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Whitefield Gardens Villa', 'Elegant 4BHK villa in prime Whitefield location.', 'ITPL Road, Whitefield', 42000000, 'villa', 'Bangalore', 'Whitefield', 4, 4, 3500, true, true, true, 0.90, '["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800"]', 12.9698, 77.7500),

('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Koramangala Studio', 'Trendy studio apartment perfect for singles.', 'Block 5, Koramangala', 4500000, 'apartment', 'Bangalore', 'Koramangala', 1, 1, 650, true, true, false, 0.75, '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"]', 12.9352, 77.6245),

('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Indiranagar Premium Flat', 'Renovated 3BHK in Indiranagar with vintage charm.', '12th Main, Indiranagar', 18500000, 'apartment', 'Bangalore', 'Indiranagar', 3, 2, 1900, true, true, true, 0.87, '["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"]', 12.9784, 77.6408),

-- Chennai Properties
('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'OMR Heights', 'Brand new 2BHK in IT corridor with clubhouse.', 'Thoraipakkam, OMR', 7200000, 'apartment', 'Chennai', 'OMR', 2, 2, 1200, true, true, false, 0.79, '["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"]', 12.9300, 80.2279),

('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Adyar River View', 'Spacious 4BHK with river views near schools.', 'Gandhi Nagar, Adyar', 32000000, 'apartment', 'Chennai', 'Adyar', 4, 3, 2600, true, true, true, 0.91, '["https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800"]', 13.0012, 80.2565),

-- Mumbai Properties
('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Powai Lake Residency', 'Luxury 3BHK with lake views and concierge service.', 'Hiranandani Gardens, Powai', 45000000, 'apartment', 'Mumbai', 'Powai', 3, 3, 2100, true, true, true, 0.93, '["https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800"]', 19.1176, 72.9060),

('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Andheri West Studio', 'Compact studio near metro and airport.', 'Lokhandwala, Andheri West', 8500000, 'apartment', 'Mumbai', 'Andheri West', 1, 1, 550, true, true, false, 0.76, '["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800"]', 19.1368, 72.8276),

-- Pune Properties
('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Hinjewadi Tech Villa', '4BHK villa near IT parks with home office.', 'Phase 3, Hinjewadi', 28000000, 'villa', 'Pune', 'Hinjewadi', 4, 4, 3000, true, true, true, 0.86, '["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800"]', 18.5912, 73.7380),

('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Kothrud Family Home', 'Well-maintained 3BHK in peaceful area.', 'Paud Road, Kothrud', 14500000, 'apartment', 'Pune', 'Kothrud', 3, 2, 1600, true, true, false, 0.83, '["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"]', 18.5074, 73.8077),

-- Commercial & Plot Properties
('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'IT Park Office Space', 'Ready office space with 50 workstations.', 'HITEC City, Hyderabad', 75000000, 'commercial', 'Hyderabad', 'HITEC City', 0, 4, 5000, true, true, true, 0.89, '["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800"]', 17.4435, 78.3772),

('4eb95250-d2d3-4e05-a37e-c5045ca8c820', 'Shamshabad Premium Plot', 'HMDA approved residential plot near airport.', 'Shamshabad', 15000000, 'plot', 'Hyderabad', 'Shamshabad', 0, 0, 2400, true, true, true, 0.88, '["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800"]', 17.2403, 78.4294);