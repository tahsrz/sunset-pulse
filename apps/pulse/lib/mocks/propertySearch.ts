type MockProperty = {
  _id: string;
  owner: string;
  name: string;
  type: string;
  description: string;
  location: { street: string; city: string; state: string; zipcode: string };
  location_geo: { type: 'Point'; coordinates: [number, number] };
  beds: number;
  baths: number;
  square_feet: number;
  list_price: number;
  price_type: 'sale';
  amenities: string[];
  images: string[];
  image_url: string;
  source: 'MLS';
  mls_id: string;
  listing_status: 'Active';
  is_demo: boolean;
};

export const mockSearchProperties: MockProperty[] = [
  {
    _id: 'mock-property-cedar-ridge',
    owner: 'mock-operator',
    name: '418 Cedar Ridge Drive',
    type: 'Single Family',
    description: 'Updated three-bedroom home with a covered patio and flexible office.',
    location: { street: '418 Cedar Ridge Drive', city: 'Fort Worth', state: 'TX', zipcode: '76107' },
    location_geo: { type: 'Point', coordinates: [-97.3659, 32.7454] },
    beds: 3,
    baths: 2,
    square_feet: 1840,
    list_price: 499000,
    price_type: 'sale',
    amenities: ['Covered patio', 'Two-car garage', 'Flexible office'],
    images: ['https://images.unsplash.com/photo-1568605114967-8130f3a36994'],
    image_url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994',
    source: 'MLS',
    mls_id: 'MOCK-FTW-418',
    listing_status: 'Active',
    is_demo: true,
  },
  {
    _id: 'mock-property-oak-terrace',
    owner: 'mock-operator',
    name: '72 Oak Terrace',
    type: 'Townhouse',
    description: 'Low-maintenance townhome near dining and trail access.',
    location: { street: '72 Oak Terrace', city: 'Fort Worth', state: 'TX', zipcode: '76110' },
    location_geo: { type: 'Point', coordinates: [-97.3493, 32.7194] },
    beds: 2,
    baths: 2.5,
    square_feet: 1420,
    list_price: 365000,
    price_type: 'sale',
    amenities: ['Attached garage', 'Trail access'],
    images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6'],
    image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6',
    source: 'MLS',
    mls_id: 'MOCK-FTW-072',
    listing_status: 'Active',
    is_demo: true,
  },
  {
    _id: 'mock-property-lakeview',
    owner: 'mock-operator',
    name: '905 Lakeview Lane',
    type: 'Single Family',
    description: 'Four-bedroom home with a pool, large yard, and easy commuter access.',
    location: { street: '905 Lakeview Lane', city: 'Arlington', state: 'TX', zipcode: '76013' },
    location_geo: { type: 'Point', coordinates: [-97.1072, 32.7074] },
    beds: 4,
    baths: 3,
    square_feet: 2460,
    list_price: 585000,
    price_type: 'sale',
    amenities: ['Pool', 'Large yard', 'Covered patio'],
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c'],
    image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c',
    source: 'MLS',
    mls_id: 'MOCK-ARL-905',
    listing_status: 'Active',
    is_demo: true,
  },
];

export function filterMockSearchProperties(params: Record<string, string>) {
  const location = params.location?.trim().toLowerCase();
  const propertyType = params.propertyType?.trim().toLowerCase();
  const minimumBeds = numberParam(params.beds);
  const minimumBaths = numberParam(params.baths);
  const minimumPrice = numberParam(params.minPrice);
  const maximumPrice = numberParam(params.maxPrice);
  const requestedAmenities = params.amenities?.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean) || [];

  return mockSearchProperties.filter((property) => {
    const searchable = [property.name, property.description, property.location.street, property.location.city, property.location.state, property.location.zipcode]
      .join(' ')
      .toLowerCase();
    if (location && !searchable.includes(location)) return false;
    if (propertyType && propertyType !== 'all' && property.type.toLowerCase() !== propertyType) return false;
    if (minimumBeds !== null && property.beds < minimumBeds) return false;
    if (minimumBaths !== null && property.baths < minimumBaths) return false;
    if (minimumPrice !== null && property.list_price < minimumPrice) return false;
    if (maximumPrice !== null && property.list_price > maximumPrice) return false;
    return requestedAmenities.every((amenity) => property.amenities.some((value) => value.toLowerCase().includes(amenity)));
  });
}

function numberParam(value: string | undefined) {
  if (!value || value === 'Any') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
