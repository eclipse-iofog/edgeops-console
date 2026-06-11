export type IdentityGroup = {
  id: string;
  name: string;
  isSystem?: boolean;
  description?: string;
};

export type GroupFormDraft = {
  name: string;
  description: string;
};
