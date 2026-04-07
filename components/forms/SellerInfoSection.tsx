import React from 'react';

interface SellerInfoSectionProps {
  seller_info: {
    name: string;
    email: string;
    phone: string;
  };
  onChange: (e: React.ChangeEvent<any>) => void;
}

const SellerInfoSection: React.FC<SellerInfoSectionProps> = ({ seller_info, onChange }) => {
  return (
    <>
      <div className='mb-4'>
        <label
          htmlFor='seller_name'
          className='block text-gray-700 font-bold mb-2'
        >
          Seller Name
        </label>
        <input
          type='text'
          id='seller_name'
          name='seller_info.name'
          className='border rounded w-full py-2 px-3'
          placeholder='Name'
          value={seller_info.name}
          onChange={onChange}
        />
      </div>
      <div className='mb-4'>
        <label
          htmlFor='seller_email'
          className='block text-gray-700 font-bold mb-2'
        >
          Seller Email
        </label>
        <input
          type='email'
          id='seller_email'
          name='seller_info.email'
          className='border rounded w-full py-2 px-3'
          placeholder='Email address'
          required
          value={seller_info.email}
          onChange={onChange}
        />
      </div>
      <div className='mb-4'>
        <label
          htmlFor='seller_phone'
          className='block text-gray-700 font-bold mb-2'
        >
          Seller Phone
        </label>
        <input
          type='tel'
          id='seller_phone'
          name='seller_info.phone'
          className='border rounded w-full py-2 px-3'
          placeholder='Phone'
          value={seller_info.phone}
          onChange={onChange}
        />
      </div>
    </>
  );
};

export default SellerInfoSection;
