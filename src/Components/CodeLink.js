import React from 'react';
import { Link } from 'react-router-dom';
import { useCodeDrawer } from '../CodeDrawerContext';

function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey || event.button !== 0);
}

export default function CodeLink({ codeId, to, children, onClick, ...rest }) {
  const { openDrawer } = useCodeDrawer();
  const destination = to || (codeId ? `/code/${codeId}` : '#');

  const handleClick = (event) => {
    if (onClick) {
      onClick(event);
      if (event.defaultPrevented) {
        return;
      }
    }

    if (!codeId || isModifiedEvent(event)) {
      return;
    }

    event.preventDefault();
    openDrawer(codeId);
  };

  return (
    <Link to={destination} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
