import { createBrowserRouter, Navigate } from 'react-router';

import { ROUTES } from '../../shared/constants/routes';
import { Layout } from '../layouts/Layout';
import PublicLayout from '../layouts/PublicLayout';
import SystemLayOut from '../layouts/SystemLayOut';

import { AuthRoute } from './AuthRoute';
import HomeRoute from './HomeRoute';

import { NotFoundPage } from '@/pages/404';
import { AdminPage } from '@/pages/admin';
import {
  Communiity,
  DayoffPage,
  DayoffDetailPage,
  FreeboardPage,
  FreeBoardDetail,
  NoticePage,
  NoticeDetail,
  ShiftPage,
  ShiftDetailPage,
} from '@/pages/community';
import CommunityPage from '@/pages/community/ui/CommunityPage';
import { LoginPage } from '@/pages/login';
import PayPage from '@/pages/payroll/PayPage';
import { SchedulePage } from '@/pages/schedule';
import { WorkStatusPage } from '@/pages/work-status';

export const router = createBrowserRouter([
  {
    path: ROUTES.ROOT,
    element: (
      <AuthRoute isPublic>
        <PublicLayout />
      </AuthRoute>
    ),
    children: [
      {
        path: ROUTES.LOGIN,
        element: <LoginPage />,
      },
      {
        path: ROUTES.NOT_FOUND,
        element: <NotFoundPage />,
      },
    ],
  },

  // Work Status - 시스템 계정 전용 (다른 계정도 접근 가능)
  {
    path: ROUTES.WORK_STATUS,
    element: (
      <AuthRoute allowSystem>
        <SystemLayOut />
      </AuthRoute>
    ),
    children: [
      {
        index: true,
        element: <WorkStatusPage />,
      },
    ],
  },

  // Private routes - 크루/관리자만 접근 (시스템 계정 차단)
  {
    path: ROUTES.ROOT,
    element: (
      <AuthRoute>
        <Layout />
      </AuthRoute>
    ),
    children: [
      {
        index: true,
        element: <HomeRoute />,
      },
      {
        path: ROUTES.PAY,
        element: <PayPage />,
      },
      {
        path: ROUTES.SCHEDULE,
        element: <SchedulePage />,
      },
      {
        path: ROUTES.ADMIN,
        element: (
          <AuthRoute requireAdmin>
            <AdminPage />
          </AuthRoute>
        ),
      },
      {
        path: ROUTES.COMMUNITY,
        element: <Communiity />,
        children: [
          {
            index: true,
            element: <Navigate to="community" replace />,
          },
          {
            path: 'community',
            children: [
              { index: true, element: <CommunityPage /> },
              { path: ':id', element: <NoticeDetail /> },
            ],
          },
          {
            path: 'notice',
            children: [
              { index: true, element: <NoticePage /> },
              { path: ':id', element: <NoticeDetail /> },
            ],
          },
          {
            path: 'shift',
            children: [
              { index: true, element: <ShiftPage /> },
              { path: ':id', element: <ShiftDetailPage /> },
            ],
          },
          {
            path: 'dayoff',
            children: [
              { index: true, element: <DayoffPage /> },
              { path: ':id', element: <DayoffDetailPage /> },
            ],
          },
          {
            path: 'freeboard',
            children: [
              { index: true, element: <FreeboardPage /> },
              { path: ':id', element: <FreeBoardDetail /> },
            ],
          },
        ],
      },
    ],
  },
]);
