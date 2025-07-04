export interface Campaign {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  user_role: 'owner' | 'reader' | 'editor';
}

export interface CreateCampaignResponse {
  message: string;
  campaign?: Campaign;
}

export interface DeleteAccountResponse {
  message: string;
}

export interface DeleteCampaignResponse {
  message: string;
  success: boolean;
}

export interface LeaveSharedCampaignResponse {
  message: string;
  success: boolean;
}

export interface InviteUserRequest {
  email: string;
  campaignId: number;
  role: 'reader' | 'editor';
}

export interface InviteUserResponse {
  message: string;
  success: boolean;
}

export interface PendingInvitation {
  id: number;
  campaignId: number;
  campaignName: string;
  inviterName: string;
  role: 'reader' | 'editor';
}

export interface PendingInvitationsResponse {
  invitations: PendingInvitation[];
  success: boolean;
}

export interface InvitationActionResponse {
  message: string;
  success: boolean;
  campaignId?: number;
}

export interface InviteUserData {
  email: string;
  campaignId: number;
  role: 'reader' | 'editor';
}