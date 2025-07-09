import { Component, OnInit, signal, inject, DestroyRef, output, HostListener } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { DOCUMENT } from '@angular/common';

//Services
import { HeaderService } from '../../../services/header/header.service';
import { ModalService } from '../../../services/modal/modal.service';

// Composants enfants
import { CampaignSelectorComponent } from './components/campaign-selector/campaign-selector.component';
import { UserMenuComponent } from './components/user-menu/user-menu.component';
import { CampaignModalComponent } from './modals/campaign-modal/campaign-modal.component';
import { SettingsModalComponent } from './modals/settings-modal/settings-modal.component';
import { ProfileModalComponent } from './modals/profile-modal/profile-modal.component';
import { DeleteConfirmationModalComponent } from './modals/delete-confirmation-modal/delete-confirmation-modal.component';

//Modèles
import { Campaign, InviteUserData, PendingInvitation } from '../../../models/campaign.model';
import { UpdateProfileData } from '../../../models/user.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CampaignSelectorComponent,
    UserMenuComponent,
    CampaignModalComponent,
    SettingsModalComponent,
    ProfileModalComponent,
    DeleteConfirmationModalComponent
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private document = inject(DOCUMENT);
  private modalService = inject(ModalService);

  // Outputs
  logout = output<void>();
  campaignSelected = output<string>();
  accountDeleted = output<void>();
  
  // État principal
  userFullName = signal<string>('');
  userFirstName = signal<string>('');
  userLastName = signal<string>('');
  campaigns = signal<Campaign[]>([]);
  currentCampaign = signal<string>('');
  loadingState = signal<'idle' | 'loading' | 'error'>('idle');
  error = signal<string | null>(null);
  successMessage = signal<string>('');
  
  // État des invitations
  pendingInvitations = signal<PendingInvitation[]>([]);
  
  // État des modals (maintenant géré par le service)
  campaignToDelete = signal<Campaign | null>(null);

  constructor(private headerService: HeaderService) {}

  ngOnInit() {
    this.loadInitialData();
    this.loadCurrentCampaign();
  }

  // Gestionnaire global pour les raccourcis clavier
  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    this.modalService.handleKeyboardShortcuts(event);
  }

  private loadInitialData() {
    this.loadingState.set('loading');
    
    forkJoin({
      user: this.headerService.getUserName(),
      campaigns: this.headerService.getCampaigns(),
      invitations: this.headerService.getPendingInvitations()
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: ({ user, campaigns, invitations }) => {
        this.userFirstName.set(user.first_name);
        this.userLastName.set(user.last_name);
        this.userFullName.set(`${user.first_name} ${user.last_name}`);
        this.campaigns.set(campaigns);
        this.pendingInvitations.set(invitations);
        this.loadingState.set('idle');
        this.error.set(null);
      },
      error: (err) => {
        this.userFullName.set('Utilisateur');
        this.userFirstName.set('');
        this.userLastName.set('');
        this.campaigns.set([]);
        this.pendingInvitations.set([]);
        this.loadingState.set('error');
        this.error.set('Erreur lors du chargement des données');
        console.error('Erreur lors du chargement:', err);
      }
    });
  }

  private loadCurrentCampaign() {
    const savedCampaign = localStorage.getItem('currentCampaign') || '';
    this.currentCampaign.set(savedCampaign);
  }

  // === Handlers pour les événements des composants enfants ===

  onCampaignSelected(name: string) {
    this.selectCampaign(name);
  }

  onCreateCampaign(name: string) {
    this.createCampaign(name);
  }

  onOpenCampaignModal() {
    this.modalService.openCampaignModal();
  }

  onCloseCampaignModal() {
    this.modalService.closeCampaignModal();
    this.error.set(null);
  }

  onOpenSettingsModal() {
    this.modalService.openSettingsModal();
    this.error.set(null);
    this.successMessage.set('');
    // Recharger les invitations quand on ouvre les paramètres
    this.loadPendingInvitations();
  }

  onCloseSettingsModal() {
    this.modalService.closeSettingsModal();
    this.error.set(null);
    this.successMessage.set('');
  }

  onOpenProfileModal() {
    this.modalService.openProfileModal();
    this.error.set(null);
    this.successMessage.set('');
  }

  onCloseProfileModal() {
    this.modalService.closeProfileModal();
    this.error.set(null);
    this.successMessage.set('');
  }

  onUpdateProfile(profileData: UpdateProfileData) {
    this.updateProfile(profileData);
  }

  onConfirmDeleteAccount() {
    this.modalService.openDeleteConfirmationModal();
  }

  onCloseDeleteConfirmModal() {
    this.modalService.closeDeleteConfirmationModal();
  }

  onDeleteAccount() {
    this.deleteAccount();
  }

  onDeleteCampaign(campaign: Campaign) {
    this.confirmDeleteCampaign(campaign);
  }

  onConfirmDeleteCampaign() {
    this.deleteCampaign();
  }

  onCloseDeleteCampaignModal() {
    this.modalService.closeDeleteCampaignModal();
    this.campaignToDelete.set(null);
    this.error.set(null);
  }

  onInviteUser(data: InviteUserData) {
    this.inviteUser(data);
  }

  onAcceptInvitation(invitationId: number) {
    this.acceptInvitation(invitationId);
  }

  onRejectInvitation(invitationId: number) {
    this.rejectInvitation(invitationId);
  }

  onLogout() {
    this.logout.emit();
  }

  // === Méthodes de logique métier (inchangées) ===

  private selectCampaign(name: string) {
    const campaign = this.campaigns().find(c => c.name === name);
    
    localStorage.setItem('currentCampaign', name);
    
    if (campaign) {
      localStorage.setItem('currentCampaignId', campaign.id.toString());
    }
    
    this.currentCampaign.set(name);
    this.campaignSelected.emit(name);
    
    this.document.defaultView?.location.reload();
  }

  private createCampaign(name: string) {
    if (!name.trim()) return;
    
    this.loadingState.set('loading');
    this.error.set(null);
    
    this.headerService.createCampaign(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.campaign) {
            const newCampaign: Campaign = response.campaign;
            this.campaigns.update(campaigns => [...campaigns, newCampaign]);
            this.selectCampaign(newCampaign.name);
          } else {
            this.headerService.getCampaigns()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (campaigns) => {
                  this.campaigns.set(campaigns);
                  const createdCampaign = campaigns.find(c => c.name === name);
                  if (createdCampaign) {
                    this.selectCampaign(createdCampaign.name);
                  }
                }
              });
          }
          
          this.modalService.closeCampaignModal();
          this.loadingState.set('idle');
          this.successMessage.set('Campagne créée avec succès');
          this.clearSuccessMessage();
        },
        error: (err) => {
          this.loadingState.set('error');
          this.error.set('Erreur lors de la création de la campagne');
          console.error('Erreur création campagne:', err);
        }
      });
  }

  private updateProfile(profileData: UpdateProfileData) {
    this.loadingState.set('loading');
    this.error.set(null);
    
    this.headerService.updateProfile(profileData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loadingState.set('idle');
          
          if (response.success) {
            // Mettre à jour les données locales
            this.userFirstName.set(profileData.firstName);
            this.userLastName.set(profileData.lastName);
            this.userFullName.set(`${profileData.firstName} ${profileData.lastName}`);
            
            this.modalService.closeProfileModal();
            this.successMessage.set(response.message || 'Profil mis à jour avec succès');
            this.clearSuccessMessage();
          } else {
            this.error.set(response.message || 'Erreur lors de la mise à jour du profil');
          }
        },
        error: (err) => {
          this.loadingState.set('idle');
          this.error.set(err.message || 'Erreur lors de la mise à jour du profil');
          console.error('Erreur mise à jour profil:', err);
        }
      });
  }

  private deleteAccount() {
    this.loadingState.set('loading');
    this.error.set(null);
    
    this.headerService.deleteAccount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          localStorage.removeItem('currentCampaign');
          localStorage.removeItem('currentCampaignId');
          
          this.modalService.closeDeleteConfirmationModal();
          this.modalService.closeSettingsModal();
          
          this.accountDeleted.emit();
          
          this.document.defaultView?.location.assign('/login');
        },
        error: (err) => {
          this.loadingState.set('error');
          this.error.set('Erreur lors de la suppression du compte');
          console.error('Erreur suppression compte:', err);
        }
      });
  }

  private canDeleteCampaign(campaign: Campaign): boolean {
    // Ne peut pas supprimer/quitter la campagne actuellement sélectionnée
    if (campaign.name === this.currentCampaign()) {
      return false;
    }
    return true;
  }

  private confirmDeleteCampaign(campaign: Campaign) {
    if (!this.canDeleteCampaign(campaign)) {
      this.error.set('Impossible de supprimer la campagne actuellement sélectionnée. Veuillez d\'abord sélectionner une autre campagne.');
      return;
    }

    this.campaignToDelete.set(campaign);
    this.modalService.openDeleteCampaignModal();
    this.error.set(null);
  }

  private deleteCampaign() {
    const campaign = this.campaignToDelete();
    if (!campaign) return;

    if (!this.canDeleteCampaign(campaign)) {
      this.error.set('Impossible de supprimer la campagne actuellement sélectionnée.');
      this.modalService.closeDeleteCampaignModal();
      this.campaignToDelete.set(null);
      return;
    }

    this.loadingState.set('loading');
    this.error.set(null);

    // Vérifier si c'est une campagne partagée ou une campagne propre
    if (campaign.user_role === 'owner') {
      // Supprimer une campagne propre
      this.headerService.deleteCampaign(campaign.id, campaign.name)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.campaigns.update(campaigns => 
              campaigns.filter(c => c.id !== campaign.id)
            );

            this.modalService.closeDeleteCampaignModal();
            this.campaignToDelete.set(null);
            this.loadingState.set('idle');
            this.successMessage.set(`Campagne "${campaign.name}" supprimée avec succès`);
            this.clearSuccessMessage();
          },
          error: (err) => {
            this.loadingState.set('error');
            this.error.set('Erreur lors de la suppression de la campagne');
            console.error('Erreur suppression campagne:', err);
          }
        });
    } else {
      // Quitter une campagne partagée
      this.headerService.leaveSharedCampaign(campaign.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.campaigns.update(campaigns => 
              campaigns.filter(c => c.id !== campaign.id)
            );

            this.modalService.closeDeleteCampaignModal();
            this.campaignToDelete.set(null);
            this.loadingState.set('idle');
            this.successMessage.set(`Vous avez quitté la campagne "${campaign.name}" avec succès`);
            this.clearSuccessMessage();
          },
          error: (err) => {
            this.loadingState.set('error');
            this.error.set('Erreur lors de la sortie de la campagne partagée');
            console.error('Erreur sortie campagne partagée:', err);
          }
        });
    }
  }

  private inviteUser(data: InviteUserData) {
    const { email, campaignId, role } = data;
    
    if (!email.trim()) {
      this.error.set('L\'adresse email est requise');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      this.error.set('Veuillez entrer une adresse email valide');
      return;
    }
    
    this.loadingState.set('loading');
    this.error.set(null);
    this.successMessage.set('');
    
    this.headerService.inviteUser(email, campaignId, role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loadingState.set('idle');
          
          if (response.success) {
            this.successMessage.set(response.message);
            this.clearSuccessMessage();
          } else {
            this.error.set(response.message);
          }
        },
        error: (err) => {
          this.loadingState.set('idle');
          this.error.set(err.message || 'Erreur lors de l\'envoi de l\'invitation');
          console.error('Erreur invitation:', err);
        }
      });
  }

  private loadPendingInvitations() {
    this.headerService.getPendingInvitations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invitations) => {
          this.pendingInvitations.set(invitations);
        },
        error: (err) => {
          console.error('Erreur lors du chargement des invitations:', err);
          this.pendingInvitations.set([]);
        }
      });
  }

  private acceptInvitation(invitationId: number) {
    this.loadingState.set('loading');
    this.error.set(null);
    
    this.headerService.acceptInvitation(invitationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loadingState.set('idle');
          
          if (response.success) {
            // Supprimer l'invitation de la liste
            this.pendingInvitations.update(invitations => 
              invitations.filter(inv => inv.id !== invitationId)
            );
            
            // Recharger les campagnes pour inclure la nouvelle campagne partagée
            this.headerService.getCampaigns()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (campaigns) => {
                  this.campaigns.set(campaigns);
                }
              });
            
            this.successMessage.set(response.message);
            this.clearSuccessMessage();
          } else {
            this.error.set(response.message);
          }
        },
        error: (err) => {
          this.loadingState.set('idle');
          this.error.set(err.message || 'Erreur lors de l\'acceptation de l\'invitation');
          console.error('Erreur acceptation invitation:', err);
        }
      });
  }

  private rejectInvitation(invitationId: number) {
    this.loadingState.set('loading');
    this.error.set(null);
    
    this.headerService.rejectInvitation(invitationId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loadingState.set('idle');
          
          if (response.success) {
            // Supprimer l'invitation de la liste
            this.pendingInvitations.update(invitations => 
              invitations.filter(inv => inv.id !== invitationId)
            );
            
            this.successMessage.set(response.message);
            this.clearSuccessMessage();
          } else {
            this.error.set(response.message);
          }
        },
        error: (err) => {
          this.loadingState.set('idle');
          this.error.set(err.message || 'Erreur lors du refus de l\'invitation');
          console.error('Erreur refus invitation:', err);
        }
      });
  }

  private clearSuccessMessage() {
    setTimeout(() => {
      this.successMessage.set('');
    }, 5000);
  }

  // === Getters pour la compatibilité avec les composants enfants ===

  get canDeleteCampaignFn() {
    return (campaign: Campaign) => this.canDeleteCampaign(campaign);
  }

  get campaignToDeleteValue() {
    return this.campaignToDelete();
  }

  // === Getters pour l'état des modals (via le service) ===

  get showCampaignModal() {
    return () => this.modalService.states().campaign;
  }

  get showSettingsModal() {
    return () => this.modalService.states().settings;
  }

  get showProfileModal() {
    return () => this.modalService.states().profile;
  }

  get showDeleteConfirmModal() {
    return () => this.modalService.states().deleteConfirmation;
  }

  get showDeleteCampaignModal() {
    return () => this.modalService.states().deleteCampaign;
  }

  // === Méthodes pour la modal de suppression unifiée ===

  getDeleteModalTitle(): string {
    if (this.modalService.states().deleteConfirmation) {
      return 'Confirmer la suppression';
    } else if (this.modalService.states().deleteCampaign) {
      const campaign = this.campaignToDelete();
      if (campaign?.user_role === 'owner') {
        return 'Supprimer la campagne';
      } else {
        return 'Quitter la campagne';
      }
    }
    return '';
  }

  getDeleteModalMessage(): string {
    if (this.modalService.states().deleteConfirmation) {
      return 'Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action ne peut pas être annulée.';
    } else if (this.modalService.states().deleteCampaign) {
      const campaign = this.campaignToDelete();
      if (campaign) {
        if (campaign.user_role === 'owner') {
          return `Êtes-vous sûr de vouloir supprimer définitivement la campagne "${campaign.name}" ? Cette action supprimera également tous les objectifs, actions et tâches associés. Cette action ne peut pas être annulée.`;
        } else {
          return `Êtes-vous sûr de vouloir quitter la campagne "${campaign.name}" ? Vous n'aurez plus accès à cette campagne partagée.`;
        }
      }
    }
    return '';
  }

  onCloseDeleteModal() {
    if (this.modalService.states().deleteConfirmation) {
      this.onCloseDeleteConfirmModal();
    } else if (this.modalService.states().deleteCampaign) {
      this.onCloseDeleteCampaignModal();
    }
  }

  onConfirmDelete() {
    if (this.modalService.states().deleteConfirmation) {
      this.onDeleteAccount();
    } else if (this.modalService.states().deleteCampaign) {
      this.onConfirmDeleteCampaign();
    }
  }
}