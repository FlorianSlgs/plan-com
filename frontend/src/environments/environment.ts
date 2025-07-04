export const environment = {
  baseUrl: 'http://localhost:3000/api',
  endpoints: {
    auth: '/auth',
    header: '/header',
    goals: '/goals',
    actions: '/actions',
    tasks: '/tasks'
  },
  defaultOptions: {
    withCredentials: true,
        headers: {
      'Accept': 'application/json'
    },
  }
  };