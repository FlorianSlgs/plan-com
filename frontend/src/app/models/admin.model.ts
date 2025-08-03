export interface Campaign {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface AdminStats {
  totalCampaigns: number;
  totalUsers: number;
  totalAdmins: number;
}

export interface AdminResponse<T> {
  success: boolean;
  data: T;
  count?: number;
}