import { useOutletContext } from "react-router-dom";

import type { AuthenticatedAdmin } from "./types";

export function useAdminSession() {
  return useOutletContext<AuthenticatedAdmin>();
}

