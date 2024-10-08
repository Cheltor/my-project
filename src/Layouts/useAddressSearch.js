import { useState, useEffect } from 'react';

function useAddressSearch() {
  const [addresses, setAddresses] = useState([]);
  const [filteredAddresses, setFilteredAddresses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Fetch the list of addresses from the API
    fetch('http://127.0.0.1:8000/addresses/')
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => {
        setAddresses(data); // Set the addresses data
      })
      .catch((error) => {
        console.error('Error fetching addresses:', error);
      });
  }, []);

  const handleSearchChange = (event) => {
    const searchTerm = event.target.value.toLowerCase();
    setSearchTerm(searchTerm);

    // Only show dropdown and filter if search term has at least 3 characters
    if (searchTerm.length >= 3) {
      const filtered = addresses.filter(
        (address) =>
          (address.combadd && address.combadd.toLowerCase().includes(searchTerm)) ||
          (address.ownername && address.ownername.toLowerCase().includes(searchTerm)) ||
          (address.property_name && address.property_name.toLowerCase().includes(searchTerm))
      );
      setFilteredAddresses(filtered);
      setShowDropdown(filtered.length > 0); // Show dropdown if there are matches
    } else {
      setShowDropdown(false); // Hide dropdown if less than 3 characters
      setFilteredAddresses([]); // Clear the filtered addresses
    }
  };

  const handleDropdownSelect = (address, navigate) => {
    setSearchTerm(address.combadd);
    setShowDropdown(false); // Hide dropdown
    navigate(`/address/${address.id}`); // Navigate to the address details page
  };

  return {
    searchTerm,
    showDropdown,
    filteredAddresses,
    handleSearchChange,
    handleDropdownSelect,
  };
}

export default useAddressSearch;
