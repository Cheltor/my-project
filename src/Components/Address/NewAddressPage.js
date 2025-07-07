import React from 'react';
import NewAddressForm from './NewAddressForm';

const NewAddressPage = () => {
  return (
    <div className="max-w-xl mx-auto mt-10">
      <h1 className="text-2xl font-bold mb-4">Add New Address</h1>
      <NewAddressForm />
    </div>
  );
};

export default NewAddressPage;
