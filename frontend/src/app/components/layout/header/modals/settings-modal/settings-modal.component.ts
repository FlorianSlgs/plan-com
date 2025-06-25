import { Component, input, output, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Campaign {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  user_role: 'owner' | 'reader' | 'editor';
}

interface InviteUserData {
  email: string;
  campaignId: number;
  role: 'reader' | 'editor';
}

interface PendingInvitation {
  id: number;
  campaignId: number;
  campaignName: string;
  inviterName: string;
  role: 'reader' | 'editor';
}

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './settings-modal.component.html',
  styleUrl: './settings-modal.component.scss'
})
export class SettingsModalComponent {
  // Inputs - données reçues du composant parent
  isOpen = input.required<boolean>();
  campaigns = input.required<Campaign[]>();
  currentCampaign = input.required<string>();
  userFullName = input.required<string>();
  loadingState = input.required<'idle' | 'loading' | 'error'>();
  error = input<string | null>(null);
  successMessage = input<string>('');
  canDeleteCampaign = input.required<(campaign: Campaign) => boolean>();
  pendingInvitations = input.required<PendingInvitation[]>();

  // Outputs - événements émis vers le composant parent
  close = output<void>();
  deleteAccount = output<void>();
  deleteCampaign = output<Campaign>();
  inviteUser = output<InviteUserData>();
  acceptInvitation = output<number>();
  rejectInvitation = output<number>();

  // État local du composant pour les invitations
  inviteFormVisible = signal<number | null>(null);
  inviteEmail = signal<string>('');
  inviteRole = signal<'reader' | 'editor'>('reader');

  constructor() {
    // Réinitialiser l'état quand la modal se ferme
    effect(() => {
      if (!this.isOpen()) {
        this.resetInviteForm();
      }
    });
  }

  // Méthodes pour gérer les événements
  onClose() {
    this.close.emit();
  }

  onDeleteAccount() {
    this.deleteAccount.emit();
  }

  onDeleteCampaign(campaign: Campaign) {
    this.deleteCampaign.emit(campaign);
  }

  onAcceptInvitation(invitationId: number) {
    this.acceptInvitation.emit(invitationId);
  }

  onRejectInvitation(invitationId: number) {
    this.rejectInvitation.emit(invitationId);
  }

  // Méthodes pour la gestion des invitations
  toggleInviteForm(campaignId: number) {
    if (this.inviteFormVisible() === campaignId) {
      this.hideInviteForm();
    } else {
      this.showInviteForm(campaignId);
    }
  }

  showInviteForm(campaignId: number) {
    this.inviteFormVisible.set(campaignId);
    this.inviteEmail.set('');
    this.inviteRole.set('reader');
  }

  hideInviteForm() {
    this.inviteFormVisible.set(null);
    this.resetInviteForm();
  }

  private resetInviteForm() {
    this.inviteEmail.set('');
    this.inviteRole.set('reader');
    this.inviteFormVisible.set(null);
  }

  onInviteEmailChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.inviteEmail.set(target.value);
  }

  onInviteRoleChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.inviteRole.set(target.value as 'reader' | 'editor');
  }

  onSendInvitation(campaignId: number) {
    const email = this.inviteEmail().trim();
    const role = this.inviteRole();
    
    if (email && role) {
      this.inviteUser.emit({
        email,
        campaignId,
        role
      });
    }
  }

  // Méthodes pour la navigation et accessibilité
  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.onClose();
    }
  }

  // Méthode utilitaire pour vérifier si l'email est valide
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  // Méthode pour obtenir le texte du rôle
  getRoleDisplayText(role: 'reader' | 'editor'): string {
    return role === 'reader' ? 'Lecteur' : 'Éditeur';
  }

  // Méthode pour obtenir la couleur du badge de rôle
  getRoleBadgeClass(role: 'reader' | 'editor'): string {
    return role === 'reader' 
      ? 'bg-blue-100 text-blue-700' 
      : 'bg-green-100 text-green-700';
  }

  // Méthode pour obtenir le texte du créateur
  getCreatorDisplayText(campaign: Campaign): string {
    if (campaign.user_role === 'owner') {
      return 'Créée par vous';
    } else if (campaign.first_name && campaign.last_name) {
      return `Créée par ${campaign.first_name} ${campaign.last_name}`;
    } else {
      return 'Campagne partagée';
    }
  }

  // Méthode pour obtenir le texte du bouton d'action
  getActionButtonText(campaign: Campaign): string {
    return campaign.user_role === 'owner' ? 'Supprimer' : 'Quitter';
  }

  // Méthode pour obtenir le titre du bouton d'action
  getActionButtonTitle(campaign: Campaign): string {
    if (campaign.user_role === 'owner') {
      return this.canDeleteCampaign()(campaign) 
        ? 'Supprimer cette campagne' 
        : 'Impossible de supprimer la campagne actuellement sélectionnée';
    } else {
      return this.canDeleteCampaign()(campaign)
        ? 'Quitter cette campagne partagée'
        : 'Impossible de quitter la campagne actuellement sélectionnée';
    }
  }
}