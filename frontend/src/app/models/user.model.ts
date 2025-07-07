export interface User {
  first_name: string;
  last_name: string;
}

// Interface pour le typage fort du formulaire de registration
export interface RegisterFormData {
  lastName: string;
  firstName: string;
  birthDate: string;
  email: string;
  password: string;
}

// Interface pour les données de mise à jour du profil
export interface UpdateProfileData {
  firstName: string;
  lastName: string;
  // Nouveaux champs optionnels pour le changement de mot de passe
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

// Interface pour la réponse de mise à jour du profil
export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  user?: User;
}

// Interface spécifique pour le changement de mot de passe
export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}