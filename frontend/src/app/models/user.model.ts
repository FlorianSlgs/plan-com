export interface User {
  first_name: string;
  last_name: string;
}

// Interface pour le typage fort du formulaire
export interface RegisterFormData {
  lastName: string;
  firstName: string;
  birthDate: string;
  email: string;
  password: string;
}