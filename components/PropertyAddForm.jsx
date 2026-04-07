'use client';
import { useState, useEffect } from 'react';
import LocationSection from './forms/LocationSection';
import RVSpecsSection from './forms/RVSpecsSection';
import AmenitiesSection from './forms/AmenitiesSection';
import RatesSection from './forms/RatesSection';
import SellerInfoSection from './forms/SellerInfoSection';

const PropertyAddForm = () => {
  const [mounted, setMounted] = useState(false);
  const [fields, setFields] = useState({
    type: 'Apartment',
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
    images: [],
  });

  useEffect(() => {
    setMounted(true);
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

  const handleImageChange = (e) => {
    const { files } = e.target;

    // Clone images array
    const updatedImages = [...fields.images];

    // Add new files to the array
    for (const file of files) {
      updatedImages.push(file);
    }

    // Update state with array of images
    setFields((prevFields) => ({
      ...prevFields,
      images: updatedImages,
    }));
  };

  return (
    mounted && (
      <form
        action='/api/properties'
        method='POST'
        encType='multipart/form-data'
      >
        <h2 className='text-3xl text-center font-semibold mb-6'>
          Add Property
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

        <div className='mb-4'>
          <label
            htmlFor='images'
            className='block text-gray-700 font-bold mb-2'
          >
            Images (Select up to 4 images)
          </label>
          <input
            type='file'
            id='images'
            name='images'
            className='border rounded w-full py-2 px-3'
            accept='image/*'
            multiple
            onChange={handleImageChange}
            required
          />
        </div>

        <div>
          <button
            className='bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline'
            type='submit'
          >
            Add Property
          </button>
        </div>
      </form>
    )
  );
};
export default PropertyAddForm;
