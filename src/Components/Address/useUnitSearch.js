import { useState, useEffect } from 'react';

function useUnitSearch(addressId) {
  const [units, setUnits] = useState([]);
  const [filteredUnits, setFilteredUnits] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    // Fetch the list of units for the specific address from the API
    fetch(`http://127.0.0.1:8000/addresses/${addressId}/units`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then((data) => {
        setUnits(data); // Set the units data
      })
      .catch((error) => {
        console.error('Error fetching units:', error);
      });
  }, [addressId]);

  const handleSearchChange = (event) => {
    const searchTerm = event.target.value.toLowerCase();
    setSearchTerm(searchTerm);

    // Only show dropdown and filter if search term has at least 2 characters
    if (searchTerm.length >= 1) {
      const filtered = units.filter((unit) =>
        unit.number.toString().includes(searchTerm)  // Assuming each unit has a `number` field
      );
      setFilteredUnits(filtered);
      setShowDropdown(filtered.length > 0); // Show dropdown if there are matches
    } else {
      setShowDropdown(false); // Hide dropdown if less than 2 characters
      setFilteredUnits([]); // Clear the filtered units
    }
  };

  const handleDropdownSelect = (unit) => {
    setSearchTerm(unit.number); // Set search term to selected unit's number
    setShowDropdown(false); // Hide dropdown
    // You can handle navigation or any other action after selecting a unit
  };

  return {
    searchTerm,
    showDropdown,
    filteredUnits,
    handleSearchChange,
    handleDropdownSelect,
  };
}

export default useUnitSearch;
