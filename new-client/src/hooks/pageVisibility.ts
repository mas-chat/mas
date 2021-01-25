import { useEffect, useState } from 'react';

function getIsDocumentVisible() {
  return document.visibilityState === 'visible';
}

export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(getIsDocumentVisible());
  const onVisibilityChange = () => setIsVisible(getIsDocumentVisible());

  useEffect(() => {
    document.addEventListener('visibilitychange', onVisibilityChange, false);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  });

  return isVisible;
}
