export interface Target {
  id: string;
  targets_name: string;
  targets_description: string;
  subtargets: string | string[];
  targets_imageurl: string;
  campaign_id?: string;
}

export interface UploadResponse {
  filePath: string;
  message?: string;
}

// Nouvelle interface pour les permissions
export interface CampaignPermissions {
  hasAccess: boolean;
  isOwner: boolean;
  isReadOnly: boolean;
}

export interface TargetCard {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  items: string[];
}