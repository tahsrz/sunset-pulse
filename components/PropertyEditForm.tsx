'use client';
import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { fetchProperty } from '@/lib/core/requests';
import LocationSection from './forms/LocationSection';
import RVSpecsSection from './forms/RVSpecsSection';
import AmenitiesSection from './forms/AmenitiesSection';
import RatesSection from './forms/RatesSection';
import SellerInfoSection from './forms/SellerInfoSection';

interface PropertyFields {
  type: string;
  name: string;
  description: string;
  location: {
    street: string;
    city: string;
    state: string;
    zipcode: string;
  };
  beds: string | number;
  baths: string | number;
  square_feet: string | number;
  rv_type: string;
  rv_length: string;
  hookups: {
    water: boolean;
    sewer: boolean;
    electric: string;
  };
  amenities: string[];
  rates: {
    weekly: string | number;
    monthly: string | number;
    nightly: string | number;
  };
  seller_info: {
    name: string;
    email: string;
    phone: string;
  };
}

const PropertyEditForm: React.FC = () => {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [mounted, setMounted] = useState<boolean>(false);
  const [fields, setFields] = useState<PropertyFields>({
    type: '',
    name: '',
    description: '',
    location: {
      street: '',
      city: '',
      state: '',
      zipcode: '',
    },
    beds: '',
    baths: '',
    square_feet: '',
    rv_type: '',
    rv_length: '',
    hookups: {
      water: false,
      sewer: false,
      electric: 'None',
    },
    amenities: [],
    rates: {
      weekly: '',
      monthly: '',
      nightly: '',
    },
    seller_info: {
      name: '',
      email: '',
      phone: '',
    },
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    setMounted(true);

    // Fetch property data for form
    const fetchPropertyData = async () => {
      try {
        const propertyData = await fetchProperty(id);

        if (!propertyData) return;

        // Ensure rates are handled correctly for the form
        if (propertyData.rates) {
          const defaultRates = { ...propertyData.rates };
          for (const rate in defaultRates) {
            if (defaultRates[rate as keyof typeof defaultRates] === null) {
              (defaultRates as any)[rate] = '';
            }
          }
          propertyData.rates = defaultRates;
        }

        // Ensure hookups exist for the form
        if (!propertyData.hookups) {
          propertyData.hookups = {
            water: false,
            sewer: false,
            electric: 'None',
          };
        }

        setFields(propertyData as PropertyFields);
      } catch (error) {
        console.error('Error loading property data:', error);
        toast.error('Failed to load property details.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchPropertyData();
    }
  }, [id]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    // Check if nested property
    if (name.includes('.')) {
      const [outerKey, innerKey] = name.split('.') as [keyof PropertyFields, string];

      setFields((prevFields) => ({
        ...prevFields,
        [outerKey]: {
          ...(prevFields[outerKey] as any),
          [innerKey]: type === 'checkbox' ? checked : value,
        },
      }));
    } else {
      // Not nested
      setFields((prevFields) => ({
        ...prevFields,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleAmenitiesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    // Clone the current array
    const updatedAmenities = [...fields.amenities];

    if (checked) {
      // Add value to array
      updatedAmenities.push(value);
    } else {
      // Remove value from array
      const index = updatedAmenities.indexOf(value);

      if (index !== -1) {
        updatedAmenities.splice(index, 1);
      }
    }

    // Update state with updated array
    setFields((prevFields) => ({
      ...prevFields,
      amenities: updatedAmenities,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const formData = new FormData(e.currentTarget);

      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        body: formData,
      });

      if (res.status === 200) {
        toast.success('Property updated successfully.');
        router.push(`/properties/${id}`);
      } else if (res.status === 401 || res.status === 403) {
        toast.error('Unauthorized access restricted.');
      } else {
        toast.error('Failed to update property. Please try again.');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('A critical error occurred during update.');
    }
  };

  return (
    mounted &&
    !loading ? (
      <form onSubmit={handleSubmit} className='bg-white p-8 rounded-2xl shadow-sm border border-slate-100'>
        <h2 className='text-3xl text-center font-bold text-slate-800 mb-8'>
          Update Property Listing
        </h2>

        <div className='mb-6'>
          <label htmlFor='type' className='block text-slate-700 font-bold mb-2'>
            Property Type
          </label>
          <select
            id='type'
            name='type'
            className='border border-slate-200 rounded-xl w-full py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all'
            required
            value={fields.type}
            onChange={handleChange}
          >
            <option value='Apartment'>Apartment</option>
            <option value='Condo'>Condo</option>
            <option value='House'>House</option>
            <option value='Cabin Or Cottage'>Cabin or Cottage</option>
            <option value='RV'>RV (Rental Vehicle)</option>
            <option value='RV Park'>RV Park (Spot)</option>
            <option value='Room'>Room</option>
            <option value='Studio'>Studio</option>
            <option value='Other'>Other</option>
          </select>
        </div>
        <div className='mb-6'>
          <label className='block text-slate-700 font-bold mb-2'>
            Listing Name
          </label>
          <input
            type='text'
            id='name'
            name='name'
            className='border border-slate-200 rounded-xl w-full py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all'
            placeholder='e.g., Luxury Modern Apartment'
            required
            value={fields.name}
            onChange={handleChange}
          />
        </div>
        <div className='mb-6'>
          <label
            htmlFor='description'
            className='block text-slate-700 font-bold mb-2'
          >
            Description
          </label>
          <textarea
            id='description'
            name='description'
            className='border border-slate-200 rounded-xl w-full py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all'
            rows={4}
            placeholder='Provide a detailed description of the property'
            value={fields.description}
            onChange={handleChange}
          ></textarea>
        </div>

        <LocationSection location={fields.location} onChange={handleChange} />

        {(fields.type === 'RV' || fields.type === 'RV Park') ? (
          <RVSpecsSection 
            rv_type={fields.rv_type} 
            rv_length={fields.rv_length} 
            hookups={fields.hookups} 
            onChange={handleChange} 
          />
        ) : (
          <div className='mb-6 flex flex-wrap -mx-2'>
            <div className='w-full sm:w-1/3 px-2 mb-4 sm:mb-0'>
              <label
                htmlFor='beds'
                className='block text-slate-700 font-bold mb-2'
              >
                Bedrooms
              </label>
              <input
                type='number'
                id='beds'
                name='beds'
                className='border border-slate-200 rounded-xl w-full py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all'
                required
                value={fields.beds}
                onChange={handleChange}
              />
            </div>
            <div className='w-full sm:w-1/3 px-2 mb-4 sm:mb-0'>
              <label
                htmlFor='baths'
                className='block text-slate-700 font-bold mb-2'
              >
                Bathrooms
              </label>
              <input
                type='number'
                id='baths'
                name='baths'
                className='border border-slate-200 rounded-xl w-full py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all'
                required
                value={fields.baths}
                onChange={handleChange}
              />
            </div>
            <div className='w-full sm:w-1/3 px-2'>
              <label
                htmlFor='square_feet'
                className='block text-slate-700 font-bold mb-2'
              >
                Square Feet
              </label>
              <input
                type='number'
                id='square_feet'
                name='square_feet'
                className='border border-slate-200 rounded-xl w-full py-3 px-4 focus:ring-2 focus:ring-blue-500 outline-none transition-all'
                required
                value={fields.square_feet}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        <AmenitiesSection selectedAmenities={fields.amenities} onChange={handleAmenitiesChange} />

        <RatesSection rates={fields.rates} onChange={handleChange} />

        <SellerInfoSection seller_info={fields.seller_info} onChange={handleChange} />

        <div>
          <button
            className='bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl w-full transition-all shadow-lg shadow-blue-600/20'
            type='submit'
          >
            Update Listing
          </button>
        </div>
      </form>
    ) : null
  );
};

export default PropertyEditForm;
