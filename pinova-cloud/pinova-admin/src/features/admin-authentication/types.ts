export interface AuthenticatedAdmin {
  id: string;
  username: string;
  displayName: string;
  mustChangePassword: boolean;
  permissions: string[];
}

