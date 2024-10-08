export const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return 'N/A';
  const cleaned = ('' + phoneNumber).replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return '(' + match[1] + ') ' + match[2] + '-' + match[3];
  }
  return 'N/A';
}; 

export const formatWebsite = (website) => {
  if (!website) return 'N/A';
  return website.replace(/(^\w+:|^)\/\//, '');
};