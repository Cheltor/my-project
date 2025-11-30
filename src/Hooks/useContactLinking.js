import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const DEFAULT_CONTACT = { name: '', email: '', phone: '' };

const normalizeSegment = (segment) => {
  if (!segment) return '';
  return segment.replace(/(^\/|\/$)/g, '');
};

const isAbortError = (error) => error && error.name === 'AbortError';

const useContactLinking = (entitySegment, entityId) => {
  const segment = useMemo(() => normalizeSegment(entitySegment), [entitySegment]);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newContact, setNewContact] = useState(DEFAULT_CONTACT);
  const [submissionError, setSubmissionError] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [linkingExisting, setLinkingExisting] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);

  const searchController = useRef(null);

  const apiBase = process.env.REACT_APP_API_URL;

  const contactsPath = useMemo(() => {
    if (!segment || !entityId) return null;
    return `${apiBase}/${segment}/${entityId}/contacts`;
  }, [apiBase, segment, entityId]);

  const fetchContacts = useCallback(async () => {
    if (!contactsPath) {
      setContacts([]);
      return;
    }
    setLoadingContacts(true);
    setContactsError(null);
    try {
      const response = await fetch(contactsPath);
      if (!response.ok) throw new Error('Failed to fetch contacts');
      const payload = await response.json();
      setContacts(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setContacts([]);
      setContactsError(error.message || 'Unable to load contacts.');
    } finally {
      setLoadingContacts(false);
    }
  }, [contactsPath]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    if (searchController.current) {
      searchController.current.abort();
      searchController.current = null;
    }

    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return undefined;
    }

    const controller = new AbortController();
    searchController.current = controller;
    setIsSearching(true);

    const runSearch = async () => {
      try {
        const response = await fetch(
          `${apiBase}/contacts?search=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error('Failed to search contacts');
        const payload = await response.json();
        setSearchResults(Array.isArray(payload) ? payload : []);
      } catch (error) {
        if (isAbortError(error)) return;
        setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    };

    runSearch();

    return () => {
      controller.abort();
    };
  }, [apiBase, searchTerm]);

  const clearTransientState = useCallback(() => {
    setSearchTerm('');
    setSearchResults([]);
    setDuplicateWarning('');
    setSubmissionError(null);
    setNewContact(DEFAULT_CONTACT);
  }, []);

  const handleAddExistingContact = useCallback(
    async (contactId) => {
      if (!contactsPath || !contactId) return false;
      if (contacts.some((contact) => contact.id === contactId)) {
        setDuplicateWarning('This contact is already linked.');
        return false;
      }

      setSubmissionError(null);
      setDuplicateWarning('');
      setLinkingExisting(true);

      try {
        const response = await fetch(contactsPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contact_id: contactId }),
        });
        if (!response.ok) throw new Error('Failed to add contact');
        const payload = await response.json();
        setContacts(Array.isArray(payload) ? payload : []);
        clearTransientState();
        return true;
      } catch (error) {
        setSubmissionError('Could not add contact.');
        return false;
      } finally {
        setLinkingExisting(false);
      }
    },
    [clearTransientState, contacts, contactsPath]
  );

  const handleCreateAndAddContact = useCallback(
    async (event) => {
      if (event?.preventDefault) {
        event.preventDefault();
      }
      if (!contactsPath) return false;

      setSubmissionError(null);
      setDuplicateWarning('');
      setCreatingNew(true);

      try {
        const response = await fetch(contactsPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newContact.name?.trim() || '',
            email: newContact.email?.trim() || '',
            phone: newContact.phone?.trim() || '',
          }),
        });
        if (!response.ok) throw new Error('Failed to create contact');
        const payload = await response.json();
        setContacts(Array.isArray(payload) ? payload : []);
        clearTransientState();
        return true;
      } catch (error) {
        setSubmissionError('Could not create contact.');
        return false;
      } finally {
        setCreatingNew(false);
      }
    },
    [clearTransientState, contactsPath, newContact]
  );

  const handleRemoveContact = useCallback(
    async (contactId) => {
      if (!contactsPath || !contactId) return false;

      try {
        const response = await fetch(`${contactsPath}/${contactId}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to remove contact');
        setContacts((prev) => prev.filter((contact) => contact.id !== contactId));
        return true;
      } catch (error) {
        console.error('Error removing contact:', error);
        return false;
      }
    },
    [contactsPath]
  );

  return {
    contacts,
    loadingContacts,
    contactsError,
    searchTerm,
    setSearchTerm,
    searchResults,
    isSearching,
    newContact,
    setNewContact,
    handleAddExistingContact,
    handleCreateAndAddContact,
    handleRemoveContact,
    submissionError,
    setSubmissionError,
    duplicateWarning,
    setDuplicateWarning,
    linkingExisting,
    creatingNew,
    clearTransientState,
    refreshContacts: fetchContacts,
  };
};

export default useContactLinking;
