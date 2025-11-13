import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Provides shared pagination and search state management for tabular data.
 *
 * @param {Array} items - Source data to paginate.
 * @param {Object} options
 * @param {number} [options.itemsPerPage=10] - Number of rows per page.
 * @param {(item: any, query: string) => boolean} [options.filterFn] - Custom filter function.
 * @param {string} [options.initialQuery=''] - Initial search text.
 */
export default function usePaginatedSearch(items, options = {}) {
  const { itemsPerPage = 10, filterFn, initialQuery = '' } = options;
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [currentPage, setCurrentPage] = useState(1);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalizedQuery) {
      return Array.isArray(items) ? items : [];
    }
    if (typeof filterFn === 'function') {
      return (Array.isArray(items) ? items : []).filter((item) => filterFn(item, normalizedQuery));
    }
    return (Array.isArray(items) ? items : []).filter((item) =>
      String(item ?? '')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [items, normalizedQuery, filterFn]);

  const totalPages = useMemo(() => {
    const total = Math.ceil(filteredItems.length / itemsPerPage);
    return total > 0 ? total : 1;
  }, [filteredItems.length, itemsPerPage]);

  useEffect(() => {
    setCurrentPage((prev) => {
      if (prev > totalPages) return totalPages;
      if (prev < 1) return 1;
      return prev;
    });
  }, [totalPages]);

  const currentItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  const goToPage = useCallback(
    (pageNumber) => {
      setCurrentPage((prev) => {
        const desired = Number(pageNumber);
        if (Number.isNaN(desired)) {
          return prev;
        }
        if (desired < 1) return 1;
        if (desired > totalPages) return totalPages;
        return desired;
      });
    },
    [totalPages]
  );

  const updateSearchQuery = useCallback((value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleSearchChange = useCallback(
    (eventOrValue) => {
      const value =
        typeof eventOrValue === 'string'
          ? eventOrValue
          : eventOrValue && eventOrValue.target
          ? eventOrValue.target.value
          : '';
      updateSearchQuery(value);
    },
    [updateSearchQuery]
  );

  return {
    searchQuery,
    setSearchQuery: updateSearchQuery,
    handleSearchChange,
    currentPage,
    totalPages,
    currentItems,
    filteredItems,
    goToPage,
  };
}
