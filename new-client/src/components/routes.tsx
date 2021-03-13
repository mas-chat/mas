import React from 'react';
import Welcome from './Welcome';
import WindowSettings from './WindowSettings';
import SlidingSidebar from './SlidingSidebar';
import DesktopRootRedirect from './DesktopRootRedirect';
import Sidebar from './Sidebar';
import { Desktop } from '.';
import { Outlet } from 'react-router-dom';

const routeGenerator = (mobile: boolean) => [
  {
    caseSensitive: false,
    path: '/c',
    element: mobile ? (
      <Outlet />
    ) : (
      <>
        <Sidebar showDesktops={true} />
        <Outlet />
      </>
    ),
    children: [
      { caseSensitive: false, path: '/:windowId/settings', element: <WindowSettings /> },
      { caseSensitive: false, path: '/:windowId', element: <Desktop /> }
    ]
  },
  { caseSensitive: false, path: 'welcome', element: <Welcome /> },
  { caseSensitive: false, path: '*', element: mobile ? <SlidingSidebar /> : <DesktopRootRedirect /> }
];

export const mobileRoutes = routeGenerator(true);

export const desktopRoutes = routeGenerator(false);
