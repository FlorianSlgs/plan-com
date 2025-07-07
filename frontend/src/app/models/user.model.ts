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
}

// Interface pour la réponse de mise à jour du profil
export interface UpdateProfileResponse {
  success: boolean;
  message: string;
  user?: User;
}