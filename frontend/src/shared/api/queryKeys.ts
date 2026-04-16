export const QUERY_KEYS = {
  auth: {
    base: ['auth'] as const,
    me: () => [...QUERY_KEYS.auth.base, 'me'] as const,
  },

  post: {
    base: ['post'] as const,
    all: () => [...QUERY_KEYS.post.base, 'all'] as const,
    detail: (postId: number) => [...QUERY_KEYS.post.base, 'detail', postId] as const,
  },

  community: {
    base: ['community'] as const,
    posts: () => [...QUERY_KEYS.community.base, 'posts'] as const,
    post: (postId: number) => [...QUERY_KEYS.community.base, 'post', postId] as const,
  },

  pay: {
    base: ['pay'] as const,
    overview: (year: number) => [...QUERY_KEYS.pay.base, 'overview', year] as const,
    detail: (payId: number) => [...QUERY_KEYS.pay.base, 'detail', payId] as const,
  },

  schedule: {
    base: ['schedule'] as const,
    week: (year: number, week: number) =>
      [...QUERY_KEYS.schedule.base, 'week', year, week] as const,
    overlap: (year: number, week: number) =>
      [...QUERY_KEYS.schedule.base, 'overlap', year, week] as const,
    dayoffsBase: () => [...QUERY_KEYS.schedule.base, 'dayoffs'] as const,
    dayoffs: (status?: string) => [...QUERY_KEYS.schedule.base, 'dayoffs', 'list', status] as const,
    myDayoffs: () => [...QUERY_KEYS.schedule.base, 'dayoffs', 'my'] as const,
    adminDayoffs: () => [...QUERY_KEYS.schedule.base, 'dayoffs', 'admin'] as const,
    shiftsBase: () => [...QUERY_KEYS.schedule.base, 'shifts'] as const,
    shifts: () => [...QUERY_KEYS.schedule.base, 'shifts', 'list'] as const,
    myShifts: () => [...QUERY_KEYS.schedule.base, 'shifts', 'my'] as const,
    adminShifts: () => [...QUERY_KEYS.schedule.base, 'shifts', 'admin'] as const,
    users: () => [...QUERY_KEYS.schedule.base, 'users'] as const,
  },

  admin: {
    base: ['admin'] as const,
    holidaysBase: () => [...QUERY_KEYS.admin.base, 'holidays'] as const,
    holidays: (year: number) => [...QUERY_KEYS.admin.base, 'holidays', year] as const,
    usersBase: () => [...QUERY_KEYS.admin.base, 'users'] as const,
    users: (params?: { q?: string; limit?: number; offset?: number }) =>
      [...QUERY_KEYS.admin.base, 'users', params] as const,
    userDetail: (memberId: number) => [...QUERY_KEYS.admin.base, 'users', memberId] as const,
    pendingUsers: () => [...QUERY_KEYS.admin.base, 'pending-users'] as const,
    insuranceRates: () => [...QUERY_KEYS.admin.base, 'insurance-rates'] as const,
    insuranceRateByYear: (year: number) =>
      [...QUERY_KEYS.admin.base, 'insurance-rates', year] as const,
    dashboard: (year: number, month: number) =>
      [...QUERY_KEYS.admin.base, 'dashboard', year, month] as const,
    currentDefaultWage: () => [...QUERY_KEYS.admin.base, 'current-default-wage'] as const,
  },

  mypage: {
    base: ['mypage'] as const,
    profile: () => [...QUERY_KEYS.mypage.base, 'profile'] as const,
    attendance: (year: number, month: number) =>
      [...QUERY_KEYS.mypage.base, 'attendance', year, month] as const,
  },

  message: {
    base: ['message'] as const,
    inbox: () => [...QUERY_KEYS.message.base, 'inbox'] as const,
    outbox: () => [...QUERY_KEYS.message.base, 'outbox'] as const,
    unread: () => [...QUERY_KEYS.message.base, 'unread'] as const,
    detail: (id: number) => [...QUERY_KEYS.message.base, 'detail', id] as const,
    searchUsers: (q: string) => [...QUERY_KEYS.message.base, 'users', q] as const,
  },
} as const;
