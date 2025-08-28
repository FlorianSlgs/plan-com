export const environment = {
  baseUrl: 'https://plancomserver.duckdns.org/api/api',
  endpoints: {
    auth: '/auth',
    header: '/header',
    goals: '/goals',
    actions: '/actions',
    tasks: '/tasks',
    targets: '/targets'
  },
  defaultOptions: {
    withCredentials: true,
    headers: {
      'Accept': 'application/json'
    },
  }
};