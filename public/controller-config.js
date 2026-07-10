window.controllerConfig = {
  apiPort: 51121,
  publicUrl: 'https://<host>:51121',
  consoleUrl: 'https://<host>:51121',
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
