/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DISTRIBUTION?: "datasance" | "iofog";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

declare module "*.png" {
  const value: string;
  export default value;
}
declare module "*.jpg" {
  const value: string;
  export default value;
}
declare module "*.jpeg" {
  const value: string;
  export default value;
}
declare module "*.gif" {
  const value: string;
  export default value;
}

type ControllerAuthMode = "embedded" | "external";

interface ControllerAuthConfig {
  mode: ControllerAuthMode;
  loginUrl: string;
  refreshUrl: string;
  logoutUrl: string;
  profileUrl: string;
  changePasswordUrl: string;
  oauthAuthorizeUrl: string;
  oauthInteractionUrl: string;
}

interface ControllerConfig {
  apiPort?: number;
  publicUrl: string;
  consoleUrl?: string;
  auth: ControllerAuthConfig;
  controlPlane?: string;
}

interface Window {
  controllerConfig?: ControllerConfig;
}
