import { useContext, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ServerContext } from '../components/ServerContext';
import { parseWindowIdParam } from '../lib/urls';

export function useUrlParamsSync(): void {
  const { windowId: windowIdUrlParam } = useParams();
  const navigate = useNavigate();
  const { windowStore } = useContext(ServerContext);

  // windowId URL parameter is source of truth for the active window. This hook
  // detects changes in the URL and syncs the activeWindow windowStore prop.
  useEffect(() => {
    windowStore.changeActiveWindowById(parseWindowIdParam(windowIdUrlParam));
  }, [windowStore, windowIdUrlParam, navigate]);
}
