import React from 'react';
import { Outlet } from 'react-router-dom';
import {
  Desktop,
  DesktopRootRedirect,
  Profile,
  Search,
  Sidebar,
  SlidingSidebar,
  Welcome,
  WindowSettings,
  CreateChannel,
  JoinChannel,
  JoinIRCChannel
} from '.';

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
      { caseSensitive: false, path: 'welcome', element: <Welcome /> },
      { caseSensitive: false, path: 'profile', element: <Profile /> },
      { caseSensitive: false, path: 'search', element: <Search /> },
      { caseSensitive: false, path: 'create-channel', element: <CreateChannel /> },
      { caseSensitive: false, path: 'join-channel', element: <JoinChannel /> },
      { caseSensitive: false, path: 'join-irc-channel', element: <JoinIRCChannel /> },
      { caseSensitive: false, path: '/:activeWindowId/settings', element: <WindowSettings /> },
      { caseSensitive: false, path: '/:activeWindowId', element: <Desktop /> }
    ]
  },
  { caseSensitive: false, path: '*', element: mobile ? <SlidingSidebar /> : <DesktopRootRedirect /> }
];

export const mobileRoutes = routeGenerator(true);

export const desktopRoutes = routeGenerator(false);
