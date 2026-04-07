'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { fetchProperty } from '@/lib/core/requests';
import LocationSection from './forms/LocationSection';
import RVSpecsSection from './forms/RVSpecsSection';
import AmenitiesSection from './forms/AmenitiesSection';
import RatesSection from './forms/RatesSection';
import SellerInfoSection from './forms/SellerInfoSection';

const PropertyEditForm = () => {
  const { id } = useParams();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [fields, setFields] = useState({
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);

    // Fetch property data for form
    const fetchPropertyData = async () => {
      try {
        const propertyData = await fetchProperty(id);

        // Check rates for null, if so then make empty string
        if (propertyData && propertyData.rates) {
          const defaultRates = { ...propertyData.rates };
          for (const rate in defaultRates) {
            if (defaultRates[rate] === null) {
              defaultRates[rate] = '';
            }
          }
          propertyData.rates = defaultRates;
        }

        // Ensure hookups exist
        if (propertyData && !propertyData.hookups) {
          propertyData.hookups = {
            water: false,
            sewer: false,
            electric: 'None',
          };
        }

        setFields(propertyData);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyData();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Check if nested property
    if (name.includes('.')) {
      const [outerKey, innerKey] = name.split('.');

      setFields((prevFields) => ({
        ...prevFields,
        [outerKey]: {
          ...prevFields[outerKey],
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

  const handleAmenitiesChange = (e) => {
    const { value, checked } = e.target;

    // Clone the current array
    const updatedAmenites = [...fields.amenities];

    if (checked) {
      // Add value to array
      updatedAmenites.push(value);
    } else {
      // Remove value from array
      const index = updatedAmenites.indexOf(value);

      if (index !== -1) {
        updatedAmenites.splice(index, 1);
      }
    }

    // Update state with updated array
    setFields((prevFields) => ({
      ...prevFields,
      amenities: updatedAmenites,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData(e.target);

      const res = await fetch(`/api/properties/${id}`, {
        method: 'PUT',
        body: formData,
      });

      if (res.status === 200) {
        router.push(`/properties/${id}`);
      } else if (res.status === 401 || res.status === 403) {
        toast.error('Permission denied');
      } else {
        toast.error('Something went wrong');
      }
    } catch (error) {
      console.log(error);
      toast.error('Something went wrong');
    }
  };

  return (
    mounted &&
    !loading && (
      <form onSubmit={handleSubmit}>
        <h2 className='text-3xl text-center font-semibold mb-6'>
          Edit Property
        </h2>

        <div className='mb-4'>
          <label htmlFor='type' className='block text-gray-700 font-bold mb-2'>
            Property Type
          </label>
          <select
            id='type'
            name='type'
            className='border rounded w-full py-2 px-3'
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
        <div className='mb-4'>
          <label className='block text-gray-700 font-bold mb-2'>
            Listing Name
          </label>
          <input
            type='text'
            id='name'
            name='name'
            className='border rounded w-full py-2 px-3 mb-2'
            placeholder='eg. Beautiful Apartment In Miami'
            required
            value={fields.name}
            onChange={handleChange}
          />
        </div>
        <div className='mb-4'>
          <label
            htmlFor='description'
            className='block text-gray-700 font-bold mb-2'
          >
            Description
          </label>
          <textarea
            id='description'
            name='description'
            className='border rounded w-full py-2 px-3'
            rows='4'
            placeholder='Add an optional description of your property'
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
          <div className='mb-4 flex flex-wrap'>
            <div className='w-full sm:w-1/3 pr-2'>
              <label
                htmlFor='beds'
                className='block text-gray-700 font-bold mb-2'
              >
                Beds
              </label>
              <input
                type='number'
                id='beds'
                name='beds'
                className='border rounded w-full py-2 px-3'
                required
                value={fields.beds}
                onChange={handleChange}
              />
            </div>
            <div className='w-full sm:w-1/3 px-2'>
              <label
                htmlFor='baths'
                className='block text-gray-700 font-bold mb-2'
              >
                Baths
              </label>
              <input
                type='number'
                id='baths'
                name='baths'
                className='border rounded w-full py-2 px-3'
                required
                value={fields.baths}
                onChange={handleChange}
              />
            </div>
            <div className='w-full sm:w-1/3 pl-2'>
              <label
                htmlFor='square_feet'
                className='block text-gray-700 font-bold mb-2'
              >
                Square Feet
              </label>
              <input
                type='number'
                id='square_feet'
                name='square_feet'
                className='border rounded w-full py-2 px-3'
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
            className='bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline'
            type='submit'
          >
            Update Property
          </button>
        </div>
      </form>
    )
  );
};
export default PropertyEditForm;
