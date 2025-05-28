export interface CalendarEvent {
  id?: string; // Optionnel, pourrait être généré
  title: string;
  date: Date; // Date complète de l'événement
  startTime?: string; // Heure de début, ex: "10:00"
  currentCampaign?: string;
  userId?: string; // ID de l'utilisateur, optionnel
}