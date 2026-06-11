window.controllerConfig = {
  apiPort: 51121,
  publicUrl: 'http://localhost:51121',
  consoleUrl: 'http://localhost:3000',
  auth: {
    mode: 'embedded',
    loginUrl: '/api/v3/user/login',
    refreshUrl: '/api/v3/user/refresh',
    logoutUrl: '/api/v3/user/logout',
    profileUrl: '/api/v3/user/profile',
    changePasswordUrl: '/api/v3/user/change-password',
    oauthAuthorizeUrl: '/api/v3/user/oauth/authorize',
    oauthInteractionUrl: '/login/oauth',
  },
}
