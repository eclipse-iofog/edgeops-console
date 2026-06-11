export type IdentityUser = {
  id: string;
  email: string;
  groups: string[];
  isBootstrap?: boolean;
  mfaEnabled?: boolean;
  mustChangePassword?: boolean;
};

export type IdentityGroupOption = {
  id: string;
  name: string;
};

export type UserFormDraft = {
  email: string;
  password: string;
  groups: string[];
};

export type ResetPasswordResult = {
  temporaryPassword?: string;
  resetToken?: string;
  password?: string;
};
