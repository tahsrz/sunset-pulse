import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

type SupabaseScriptClient = {
  from: (table: string) => any;
};

const MLS_ID = '21177832';
const sourceUrl = 'https://www.atproperties.com/21177832/13656-county-road-238-clyde-texas-79510-ntreis';
const imageBase = 'https://resources.atproperties.com/images/NTREIS/21/177/832/6a4ea8baebaa0';
const images = Array.from({ length: 40 }, (_, index) => `${imageBase}/${index + 1}.jpg`);

const description = [
  'OFFERING $2,500 SELLER CONCESSIONS! Perfect Horse and Ag property. 20 acres 10 miles from Abilene.',
  'Custom 2011 home has almost 2300 sq ft offering an open concept and split arrangement. 4 bed, 2 baths, separate dining room and large eat at bar.',
  'Vaulted ceiling in living room with beautiful stone wood burning fireplace. Master bath offers 2 vanities, jacuzzi tub, walk-in shower and his and her closets.',
  'Beautifully landscaped and irrigated yard. Large, enclosed carport with storage area and attached fully insulated shop.',
  'Horse barn is 36x65 with 15 ft lean-to, 6 stalls with pipe runs, wash bay, concrete feed area, tack room and additional fully finished out, heated and cooled room that can be an office, recreation room or additional tack room.',
  'Property is fully fenced with cedar staves, has multiple traps and one has a large loafing shed. Producing coastal field. Arena is 290x160 with return alley and roping box.',
  'Newer outside 5-ton HVAC unit with transferable warranty. Amazing views, paved county road, automatic entrance gate into the property.',
  'Move-in ready. No HOA, no traffic, no restrictions, country living minutes from hospitals, airport, Taylor County Expo, shopping and dining.',
].join(' ');

const privateRemarks = [
  'Arena: 290 x 160 with holding pens and return alley. Barn: 36 x 65 with 6 indoor stalls with pipe turnouts and a 15 ft lean-to for RV or trailer parking.',
  'Cross-fenced traps are accessible from turnouts. Front trap has coastal field and loafing shed. Pergola sits on a 15 x 20 concrete slab and is fully lit by solar lights.',
  'Garage area with roll-up door and 20 x 24 workshop insulated with spray foam and electricity/lights.',
  'HVAC installed new in 2021 with 10-year warranty. Brand new refrigerator stays. Dishwasher less than a year old.',
  'See exclusion and inclusion list as there are more items that will remain.',
].join(' ');

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function csv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL || requiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .upsert({
      mls_id: MLS_ID,
      name: '13656 County Road 238',
      type: 'Residential',
      description,
      street: '13656 County Road 238',
      city: 'Clyde',
      state: 'TX',
      zip: '79510-6556',
      beds: 4,
      baths: 2,
      sqft: 2299,
      price: 924900,
      price_type: 'sale',
      rates: {},
      amenities: [
        '20 acres',
        'Horse property',
        'Arena',
        'Barn',
        'Stable',
        'Workshop',
        'RV/boat parking',
        'Electric gate',
        'Covered patio',
        'Outdoor living center',
        'Fireplace',
        'No HOA',
      ],
      image_url: images[0],
      images,
      source: 'MLS',
      listing_status: 'Active',
      is_demo: false,
      is_featured: true,
      display_public: true,
      deleted_at: null,
      last_updated: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: {
        provider: 'ntreis',
        source_system: 'NTREIS',
        ingestion: 'manual_ntreis_screenshot',
        source_url: sourceUrl,
        parcel_id: 'R000005107',
        parcel_id_2: 'R000017010',
        county: 'Callahan',
        subdivision: 'Lunatic Asylum Lands Sec 32',
        listing_agent: 'Kathy Cribbs',
        listing_office: 'Lion Drive Realty',
        original_list_price: 975000,
        list_price_per_sqft: 402.31,
        price_change_summary: '07/08/2026: DOWN: $949,900 -> $924,900',
      },
    }, { onConflict: 'mls_id' })
    .select('id, mls_id')
    .single();

  if (propertyError) throw propertyError;
  const propertyId = property.id;

  await upsert(supabase, 'mls_listing_details', {
    property_id: propertyId,
    mls_id: MLS_ID,
    source_system: 'NTREIS',
    property_type: 'Residential',
    property_subtype: 'Single Family',
    listing_status: 'Active',
    list_price: 924900,
    original_list_price: 975000,
    list_price_per_sqft: 402.31,
    price_change_summary: '07/08/2026: DOWN: $949,900 -> $924,900',
    price_changed_at: '2026-07-08',
    also_for_lease: false,
    subdivision: 'Lunatic Asylum Lands Sec 32',
    county: 'Callahan',
    country: 'United States',
    parcel_id: 'R000005107',
    parcel_id_2: 'R000017010',
    legal_description: 'ACRES: 20.000 ABST 775 SEC 32 S RUSSOM',
    unexempt_taxes: 7928,
    pid: 'No',
    multi_parcel: true,
    mud_district: false,
    special_tax_authority: false,
    year_built: 2011,
    year_built_source: 'Assessor/Preowned',
    living_area_count: 1,
    dining_area_count: 2,
    fireplace_count: 1,
    bedroom_count: 4,
    bathroom_total: 2,
    bathroom_full: 2,
    bathroom_half: 0,
    pool: false,
    garage: true,
    garage_spaces: 2,
    attached_garage: false,
    covered_parking_spaces: 2,
    garage_size: '24x30x12',
    handicap_amenities: false,
    horses_permitted: true,
    proposed_financing: ['Cash', 'Conventional', 'FHA', 'VA Loan'],
    possession: 'Closing/Funding',
    listing_terms: ['Cash', 'Conventional', 'FHA', 'VA Loan'],
    metadata: {
      smart_home_app_pwd: false,
      adult_community: false,
      list_price_per_sqft_source: 'MLS sheet',
    },
  });

  await upsert(supabase, 'mls_listing_land', {
    property_id: propertyId,
    mls_id: MLS_ID,
    lot_size_sqft: 871200,
    lot_size_acres: 20,
    lot_dimensions: '871,200 sqft',
    road_frontage_type: 'County Road',
    road_surface: 'Asphalt',
    crops_grasses: ['Coastal Bermuda'],
    soil_type: 'Sandy Loam',
    fencing: ['Barbed Wire', 'Cross Fenced', 'Fenced', 'Full', 'Gate', 'Net', 'Partial Cross', 'Perimeter', 'Pipe', 'Wire', 'Other'],
    vegetation: ['Cleared', 'Grassed'],
    lot_description: ['Acreage', 'Agricultural', 'Cleared', 'Few Trees', 'Landscaped', 'Level', 'Large Backyard Grass', 'Native - Mesquite', 'Native - Oak', 'Sloped', 'Sprinkler System'],
    current_use: ['Agricultural', 'Crops and Livestock', 'Grazing', 'Horses'],
    proposed_use: ['Agricultural', 'Equine', 'Grazing', 'Horses', 'Livestock'],
    present_use: ['Agricultural', 'Crops and Livestock', 'Grazing', 'Horses'],
    restrictions: ['None'],
    easements: ['Utilities'],
    utilities: ['Asphalt', 'City Water', 'Co-op Electric', 'Electricity Connected', 'Individual Water Meter', 'Outside City Limits', 'Phone Available', 'Rural Water District', 'Septic'],
    street_utilities: ['Asphalt', 'City Water', 'Co-op Electric', 'Electricity Connected', 'Individual Water Meter', 'Outside City Limits', 'Phone Available', 'Rural Water District', 'Septic'],
    hoa_name: 'None',
    hoa_fee_description: 'No HOA',
    subdivision_features: ['Gated entry', 'Security gate'],
  });

  await upsert(supabase, 'mls_listing_schools', {
    property_id: propertyId,
    mls_id: MLS_ID,
    district: 'Eula ISD',
    elementary: 'Eula',
    junior_high: 'Eula',
    high_school: 'Eula',
  });

  await replaceRows(supabase, 'mls_listing_rooms', propertyId, [
    room(propertyId, 'Living Room', '14 x 14', '1', ['Built-in Cabinets', 'Ceiling Fan(s)', 'Fireplace'], 1),
    room(propertyId, 'Bedroom - Primary', '15 x 20', '1', ['Ceiling Fan(s)', 'Custom Closet System', 'Ensuite Bath', 'Jetted Tub', 'Separate Shower', 'Separate Vanities', 'Sitting Area in Primary', 'Walk-in Closet(s)'], 2),
    room(propertyId, 'Office', '13 x 9', '1', ['Ceiling Fan(s)'], 3),
    room(propertyId, 'Dining Room', '13 x 9', '1', [], 4),
    room(propertyId, 'Bedroom', '13 x 13', '1', ['Ceiling Fan(s)', 'Split Bedrooms'], 5),
    room(propertyId, 'Bedroom', '13 x 13', '1', ['Split Bedrooms'], 6),
  ]);

  await replaceRows(supabase, 'mls_listing_attributes', propertyId, [
    attr(propertyId, 'general_information', 'Housing Type', 'Farm/Ranch House, Single Detached', 1),
    attr(propertyId, 'general_information', 'Style of House', 'Ranch', 2),
    attr(propertyId, 'general_information', 'Lot Size/Acres', '10 to < 50 Acres', 3),
    attr(propertyId, 'general_information', 'Alarm/Security', null, 4, ['Fire Alarm', 'Security Gate', 'Smoke Detector(s)']),
    attr(propertyId, 'general_information', 'Heating', null, 5, ['Central', 'Electric', 'Fireplace(s)']),
    attr(propertyId, 'general_information', 'Cooling', null, 6, ['Ceiling Fan(s)', 'Central Air', 'Electric', 'Roof Turbine(s)']),
    attr(propertyId, 'general_information', 'Roof', 'Composition', 7),
    attr(propertyId, 'general_information', 'Windows', null, 8, ['Electric Shades', 'Window Coverings']),
    attr(propertyId, 'general_information', 'Construction', null, 9, ['Brick', 'Rock/Stone']),
    attr(propertyId, 'general_information', 'Foundation', 'Slab', 10),
    attr(propertyId, 'general_information', 'Basement', 'No', 11),
    attr(propertyId, 'general_information', 'Fireplace Type', null, 12, ['Glass Doors', 'Living Room', 'Stone', 'Wood Burning']),
    attr(propertyId, 'general_information', 'Flooring', null, 13, ['Carpet', 'Concrete']),
    attr(propertyId, 'general_information', 'Levels', '1', 14),
    attr(propertyId, 'general_information', 'Patio/Porch', null, 15, ['Covered', 'Deck']),
    attr(propertyId, 'general_information', 'Special Notes', null, 16, ['Aerial Photo', 'Survey Available']),
    attr(propertyId, 'features', 'Appliances', null, 17, ['Dishwasher', 'Electric Range', 'Electric Water Heater', 'Microwave', 'Refrigerator']),
    attr(propertyId, 'features', 'Laundry Features', null, 18, ['Dryer - Electric Hookup', 'In Utility Room', 'W/D - Full Size W/D Area', 'Dryer Hookup', 'Washer Hookup']),
    attr(propertyId, 'features', 'Interior Features', null, 19, ['Built-in Features', 'Cable TV Available', 'Cathedral Ceiling(s)', 'Decorative Lighting', 'Double Vanity', 'Flat Screen Wiring', 'Granite Counters', 'High Speed Internet Available', 'Kitchen Island', 'Open Floorplan', 'Vaulted Ceiling(s)', 'Walk-In Closet(s)']),
    attr(propertyId, 'features', 'Exterior Features', null, 20, ['Covered Patio/Porch', 'Dog Run', 'Fire Pit', 'Rain Gutters', 'Lighting', 'Outdoor Living Center', 'Private Entrance', 'RV Hookup', 'RV/Boat Parking', 'Stable/Barn', 'Storage']),
    attr(propertyId, 'features', 'Park/Garage', null, 21, ['Additional Parking', 'Boat', 'Circular Driveway', 'Detached Carport', 'Driveway', 'Electric Gate', 'Garage Faces Side', 'Gravel', 'Lighted', 'Oversized', 'RV Access/Parking', 'RV Carport', 'Secured', 'Side By Side', 'Workshop in Garage']),
    attr(propertyId, 'land', 'Other Structures', null, 22, ['Arena', 'Barn(s)', 'Outbuilding', 'Pergola', 'RV/Boat Storage', 'Separate Entry Quarters', 'Stable(s)', 'Storage', 'Workshop']),
    attr(propertyId, 'land', 'Miscellaneous', null, 23, ['Fenced for Cattle', 'Fenced for Horses', 'Outdoor Arena']),
  ]);

  await upsert(supabase, 'mls_listing_farm_ranch', {
    property_id: propertyId,
    mls_id: MLS_ID,
    residences_count: 1,
    tank_pond_count: 0,
    barn_count: 1,
    lake_count: 0,
    pasture_acres: null,
    cultivated_acres: null,
    bottom_land_acres: null,
    irrigated_acres: null,
    aerial_photo_available: true,
    ag_exemption: true,
    land_leased: false,
    wells_count: 0,
    horse_amenities: ['Arena', 'Barn(s)', 'Electric to Barn', 'Equipment Barn', 'Hay Barn', 'Holding Pens', 'Loaf Shed(s)', 'Tack Room', 'Wash Rack', 'Water to Barn'],
    miscellaneous: ['Fenced for Cattle', 'Fenced for Horses', 'Outdoor Arena'],
    other_equipment: ['Call Listing Agent', 'List Available', 'Livestock Equipment', 'Negotiable'],
  });

  await replaceRows(supabase, 'mls_listing_structures', propertyId, [
    structure(propertyId, 'Stable', 'Stable(s) - Stalls/Size: 6/65x36', 6, '65x36', ['Pipe runs', 'Wash bay'], 1),
    structure(propertyId, 'Equipment', 'Equipment - Stalls/Size: 15x15', null, '15x15', [], 2),
    structure(propertyId, 'Barn', 'Horse barn with 15 ft lean-to', 6, '36x65', ['Electric to barn', 'Hay barn', 'Tack room', 'Wash rack', 'Water to barn'], 3),
    structure(propertyId, 'Arena', 'Arena with holding pens, return alley, and roping box', null, '290x160', ['Holding pens', 'Return alley', 'Roping box'], 4),
    structure(propertyId, 'Workshop', 'Insulated workshop with roll-up door', null, '20x24', ['Electricity', 'Lights', 'Spray foam insulation'], 5),
    structure(propertyId, 'Pergola', 'Pergola on concrete slab lit by solar lights', null, '15x20', ['Solar lights', 'Concrete slab'], 6),
  ]);

  await upsert(supabase, 'mls_listing_public_remarks', {
    property_id: propertyId,
    mls_id: MLS_ID,
    property_description: description,
    exclusions: 'See transaction desk for excluded list which also contains some personal items that are included.',
    public_driving_directions: 'Take I-20 to Elmdale Rd N. Turn TX-36 for about 4.4 miles where you will take a left onto CR 238. Follow CR 238 for approximately 6/10 of a mile and the property will be on your left. There is no realtor sign. Please look for Ranchita Reata above gate.',
  });

  await upsert(supabase, 'mls_listing_private_remarks', {
    property_id: propertyId,
    mls_id: MLS_ID,
    private_remarks: privateRemarks,
    showing_instructions: 'You can request a showing through ShowingTime or call/text listing agent. If texting, include your business information.',
    included_items: 'Brand new refrigerator stays. Some additional items remain per inclusion list.',
    excluded_items: 'See exclusion and inclusion list in transaction desk.',
  });

  await upsert(supabase, 'mls_listing_financials', {
    property_id: propertyId,
    mls_id: MLS_ID,
    loan_type: 'Treat As Clear',
    seller_concessions: true,
    second_mortgage: false,
    cumulative_days_on_market: 53,
    days_on_market: 53,
    list_type: 'Exclusive Right To Sell',
    list_date: '2026-05-07',
  });

  await upsert(supabase, 'mls_listing_contacts', {
    property_id: propertyId,
    mls_id: MLS_ID,
    list_office_name: 'Lion Drive Realty',
    list_office_code: 'LDRS01',
    list_office_phone: '713-858-8058',
    list_office_address: '3118 FM 528 #114, Webster, Texas 77598',
    list_office_email: 'eric@susprod.com',
    broker_license: '9013052',
    list_agent_name: 'Kathy Cribbs',
    list_agent_phone: '940-564-0369',
    list_agent_email: 'olneykat@hotmail.com',
    list_agent_license: '940-564-0369',
    list_agent_other_phone: '940-564-0369',
    list_agent_texting_allowed: true,
    list_office_supervisor_name: 'Eric Wargo',
    list_office_supervisor_id: '0707250',
    list_office_supervisor_phone: '713-858-8058',
  });

  await upsert(supabase, 'mls_listing_showing', {
    property_id: propertyId,
    mls_id: MLS_ID,
    call_instructions: 'Showing Service, Agent',
    appointment_phone: '817-858-0055',
    keybox_number: 'combo',
    keybox_type: 'Combo',
    owner_name: 'of record',
    seller_type: 'Standard/Individual',
    showing_instructions: 'You can request a showing through ShowingTime or call/text listing agent.',
  });

  await replaceRows(supabase, 'mls_listing_media', propertyId, images.map((url, index) => ({
    property_id: propertyId,
    mls_id: MLS_ID,
    media_type: 'image',
    url,
    caption: index === 0 ? 'Gated entry onto property' : `MLS property photo ${index + 1}`,
    sort_order: index + 1,
    source: 'atproperties_ntreis',
  })));

  console.log(JSON.stringify({ ok: true, property_id: propertyId, mls_id: MLS_ID, images: images.length }, null, 2));
}

async function upsert(supabase: SupabaseScriptClient, table: string, row: Record<string, unknown>) {
  const { error } = await supabase.from(table).upsert(row, { onConflict: 'property_id' });
  if (error) throw new Error(`${table}: ${error.message}`);
}

async function replaceRows(supabase: SupabaseScriptClient, table: string, propertyId: string, rows: Record<string, unknown>[]) {
  const deleteResult = await supabase.from(table).delete().eq('property_id', propertyId);
  if (deleteResult.error) throw new Error(`${table} delete: ${deleteResult.error.message}`);
  if (rows.length === 0) return;
  const insertResult = await supabase.from(table).insert(rows);
  if (insertResult.error) throw new Error(`${table} insert: ${insertResult.error.message}`);
}

function room(propertyId: string, roomName: string, dimensions: string, level: string, features: string[], sortOrder: number) {
  return { property_id: propertyId, mls_id: MLS_ID, room_name: roomName, dimensions, level, features, sort_order: sortOrder };
}

function attr(propertyId: string, section: string, label: string, valueText: string | null, sortOrder: number, valueList: string[] = []) {
  return { property_id: propertyId, mls_id: MLS_ID, section, label, value_text: valueText, value_list: valueList, sort_order: sortOrder };
}

function structure(propertyId: string, structureType: string, descriptionText: string, stallsCount: number | null, size: string, features: string[], sortOrder: number) {
  return {
    property_id: propertyId,
    mls_id: MLS_ID,
    structure_type: structureType,
    description: descriptionText,
    stalls_count: stallsCount,
    size,
    features,
    sort_order: sortOrder,
  };
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
