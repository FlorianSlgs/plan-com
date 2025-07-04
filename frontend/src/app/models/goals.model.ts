export interface Goal {
  id: string;
  goals_name: string;
  goals_description: string;
  subgoals: string | string[];
  goals_imageurl: string;
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

export interface GoalCard {
  id: string;
  title: string;
  imageUrl: string;
  description: string;
  items: string[];
}