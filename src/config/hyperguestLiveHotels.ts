// Live HyperGuest properties approved for booking on JaagaX (details supplied by the business).
export interface LiveHyperGuestHotel {
  id: number;
  name: string;
  brand: string;
  address: string;
  city: string;
  country: string;
  stars: number;
  currency: string;
  phone: string;
}

export const LIVE_HYPERGUEST_HOTELS: LiveHyperGuestHotel[] = [
  { id: 128382, name: "B&B HOTEL Santos Dumont", brand: "B&B Hotels", address: "Avenida Beira Mar, 280, Centro", city: "Rio de Janeiro", country: "Brazil", stars: 3, currency: "BRL", phone: "+55 21 3613-9170" },
  { id: 126632, name: "Veranda Grand Baie Hotel and Spa", brand: "ER Hospitality", address: "Coastal Road 30510", city: "Grand Baie", country: "Mauritius", stars: 4, currency: "EUR", phone: "230-260-5101" },
];
