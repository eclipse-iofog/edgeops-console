export type IdentityGroup = {
  id: string;
  name: string;
  isSystem?: boolean;
  mfaRequired?: boolean;
};

export type GroupFormDraft = {
  name: string;
  mfaRequired: boolean;
};
