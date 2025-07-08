/* import { Component, input, output, signal, inject, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { DOCUMENT } from '@angular/common';

// Services
import { HeaderService } from '../../../../services/header/header.service';

// Composants modals
import { ProfileModalComponent } from '../modals/profile-modal/profile-modal.component';
import { SettingsModalComponent } from '../modals/settings-modal/settings-modal.component';
import { DeleteConfirmationModalComponent } from '../modals/delete-confirmation-modal/delete-confirmation-modal.component';

// Modèles
import { Campaign, InviteUserData, PendingInvitation } from '../../../../models/campaign.model';
import { UpdateProfileData } from '../../../../models/user.model';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [
    ProfileModalComponent,
    SettingsModalComponent,
    DeleteConfirmationModalComponent
  ],
  template: `
    <div class="flex items-center gap-3">
      <!-- Photo de profil utilisateur -->
      <div class="relative">
        <img 
          class="w-10 h-10 rounded-full object-cover border border-gray-300 shadow-sm" 
          src="assets/images/users-01.png" 
          alt="Photo de profil de {{ userFullName() }}"
          loading="lazy" 
        />
      </div>
      
      <!-- Nom de l'utilisateur - cliquable pour ouvrir le profil -->
      <button
        class="user-name-btn text-gray-700 font-medium text-sm md:text-base truncate max-w-32 md:max-w-none hover:text-blue-600 transition-colors cursor-pointer underline-offset-2 hover:underline"
        [title]="'Cliquez pour modifier votre profil - ' + userFullName()"
        (click)="onProfileClick()"
        type="button">
        {{ userFullName() }}
      </button>
      
      <!-- Bouton Paramètres avec indicateur d'invitations -->
      <button 
        class="user-menu-btn settings-btn relative" 
        title="Paramètres du compte"
        aria-label="Ouvrir les paramètres du compte"
        (click)="onSettingsClick()"
        type="button">
        <span class="material-icons text-xl">settings</span>
        
        <!-- Badge de notification pour les invitations -->
        @if (pendingInvitations().length > 0) {
          <div class="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white shadow-md animate-pulse"
               [title]="pendingInvitations().length + ' invitation(s) en attente'"
               role="status"
               [attr.aria-label]="pendingInvitations().length + ' invitations en attente'">
            {{ pendingInvitations().length > 9 ? '9+' : pendingInvitations().length }}
          </div>
        }
      </button>
      
      <!-- Bouton Déconnexion -->
      <button 
        class="user-menu-btn logout-btn" 
        title="Se déconnecter"
        aria-label="Se déconnecter du compte"
        (click)="onLogoutClick()"
        type="button">
        <span class="material-icons text-xl">logout</span>
      </button>
    </div>

    <!-- Modal de profil utilisateur -->
    <app-profile-modal
      [isOpen]="showProfileModal()"
      [userFirstName]="userFirstName()"
      [userLastName]="userLastName()"
      [loadingState]="loadingState()"
      [error]="error()"
      [successMessage]="successMessage()"
      (close)="onCloseProfileModal()"
      (updateProfile)="onUpdateProfile($event)"
    />

    <!-- Modal des paramètres -->
    <app-settings-modal
      [isOpen]="showSettingsModal()"
      [campaigns]="campaigns()"
      [currentCampaign]="currentCampaign()"
      [userFullName]="userFullName()"
      [loadingState]="loadingState()"
      [error]="error()"
      [successMessage]="successMessage()"
      [canDeleteCampaign]="canDeleteCampaignFn"
      [pendingInvitations]="pendingInvitations()"
      (close)="onCloseSettingsModal()"
      (deleteAccount)="onConfirmDeleteAccount()"
      (deleteCampaign)="onDeleteCampaign($event)"
      (inviteUser)="onInviteUser($event)"
      (acceptInvitation)="onAcceptInvitation($event)"
      (rejectInvitation)="onRejectInvitation($event)"
    />

    <!-- Modal de confirmation de suppression -->
    <app-delete-confirmation-modal
      [isOpen]="showDeleteConfirmModal() || showDeleteCampaignModal()"
      [loadingState]="loadingState()"
      [title]="getDeleteModalTitle()"
      [message]="getDeleteModalMessage()"
      [confirmButtonText]="'Supprimer'"
      [confirmButtonClass]="'bg-red-600 hover:bg-red-700'"
      [showWarningIcon]="true"
      (close)="onCloseDeleteModal()"
      (confirm)="onConfirmDelete()"
    />
  `,
  styleUrl: './user-menu.component.scss'
})
export class UserMenuComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private document = inject(DOCUMENT);
  private headerService = inject(HeaderService);

  // Inputs optionnels - si non fournis, le composant charge les données lui-même
  userFullName = input<string>('');
  campaigns = input<Campaign[]>([]);
  currentCampaign = input<string>('');
  pendingInvitations = input<PendingInvitation[]>([]);

  // Outputs
  logout = output<void>();
  campaignSelected = output<string>();
  accountDeleted = output<void>();

  // État interne
  private _userFullName = signal<string>('');
  private _userFirstName = signal<string>('');
  private _userLastName = signal<string>('');
  private _campaigns = signal<Campaign[]>([]);
  private _currentCampaign = signal<string>('');
  private _pendingInvitations = signal<PendingInvitation[]>([]);
  
  loadingState = signal<'idle' | 'loading' | 'error'>('idle');
  error = signal<string | null>(null);
  successMessage = signal<string>('');
  
  // États des modals
  showProfileModal = signal<boolean>(false);
  showSettingsModal = signal<boolean>(false);
  showDeleteConfirmModal = signal<boolean>(false);
  showDeleteCampaignModal = signal<boolean>(false);
  campaignToDelete = signal<Campaign | null>(null);

  // Getters pour utiliser soit les inputs soit l'état interne
  get finalUserFullName() {
    return this.userFullName() || this._userFullName();
  }

  get finalUserFirstName() {
    return this._userFirstName();
  }

  get finalUserLastName() {
    return this._userLastName();
  }

  get finalCampaigns() {
    return this.campaigns().length > 0 ? this.campaigns() : this._campaigns();
  }

  get finalCurrentCampaign() {
    return this.currentCampaign() || this._currentCampaign();
  }

  get finalPendingInvitations() {
    return this.pendingInvitations().length > 0 ? this.pendingInvitations() : this._pendingInvitations();
  }

  ngOnInit() {
    // Charger les données seulement si elles ne sont pas fournies par les inputs
    if (!this.userFullName() || this.campaigns().length === 0) {
      this.loadUserData();
    }
    this.loadCurrentCampaign();
  }

  private loadUserData() {
    this.loadingState.set('loading');
    
    forkJoin({
      user: this.headerService.getUserName(),
      campaigns: this.headerService.getCampaigns(),
      invitations: this.headerService.getPendingInvitations()
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: ({ user, campaigns, invitations }) => {
        this._userFirstName.set(user.first_name);
        this._userLastName.set(user.last_name);
        this._userFullName.set(`${user.first_name} ${user.last_name}`);
        this._campaigns.set(campaigns);
        this._pendingInvitations.set(invitations);
        this.loadingState.set('idle');
        this.error.set(null);
      },
      error: (err) => {
        this._userFullName.set('Utilisateur');
        this._userFirstName.set('');
        this._userLastName.set('');
        this._campaigns.set([]);
        this._pendingInvitations.set([]);
        this.loadingState.set('error');
        this.error.set('Erreur lors du chargement des données');
        console.error('Erreur lors du chargement:', err);
      }
    });
  }

  private loadCurrentCampaign() {
    const savedCampaign = localStorage.getItem('currentCampaign') || '';
    this._currentCampaign.set(savedCampaign);
  }

  // === Handlers pour les événements ===

  onProfileClick() {
    this.showProfileModal.set(true);
    this.error.set(null);
    this.successMessage.set('');
  }

  onSettingsClick() {
    this.showSettingsModal.set(true);
    this.error.set(null);
    this.successMessage.set('');
    this.loadPendingInvitations();
  }

  onLogoutClick() {
    this.logout.emit();
  }

  onCloseProfileModal() {
    this.showProfileModal.set(false);
    this.error.set(null);
    this.successMessage.set('');
  }

  onCloseSettingsModal() {
    this.showSettingsModal.set(false);
    this.error.set(null);
    this.successMessage.set('');
  }

  onUpdateProfile(profileData: UpdateProfileData) {
    this.updateProfile(profileData);
  }

  onConfirmDeleteAccount() {
    this.showDeleteConfirmModal.set(true);
  }

  onDeleteCampaign(campaign: Campaign) {
    this.confirmDeleteCampaign(campaign);
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

  // === Méthodes de logique métier ===

  private updateProfile(profileData: UpdateProfileData) {
    this.loadingState.set('loading');
    this.error.set(null);
    
    this.headerService.updateProfile(profileData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.loadingState.set('idle');
          
          if (response.success) {
            this._userFirstName.set(profileData.firstName);
            this._userLastName.set(profileData.lastName);
            this._userFullName.set(`${profileData.firstName} ${profileData.lastName}`);
            
            this.showProfileModal.set(false);
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

  private confirmDeleteCampaign(campaign: Campaign) {
    if (!this.canDeleteCampaign(campaign)) {
      this.error.set('Impossible de supprimer la campagne actuellement sélectionnée. Veuillez d\'abord sélectionner une autre campagne.');
      return;
    }

    this.campaignToDelete.set(campaign);
    this.showDeleteCampaignModal.set(true);
    this.error.set(null);
  }

  private deleteCampaign() {
    const campaign = this.campaignToDelete();
    if (!campaign) return;

    if (!this.canDeleteCampaign(campaign)) {
      this.error.set('Impossible de supprimer la campagne actuellement sélectionnée.');
      this.showDeleteCampaignModal.set(false);
      this.campaignToDelete.set(null);
      return;
    }

    this.loadingState.set('loading');
    this.error.set(null);

    if (campaign.user_role === 'owner') {
      this.headerService.deleteCampaign(campaign.id, campaign.name)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this._campaigns.update(campaigns => 
              campaigns.filter(c => c.id !== campaign.id)
            );
            this.showDeleteCampaignModal.set(false);
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
      this.headerService.leaveSharedCampaign(campaign.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this._campaigns.update(campaigns => 
              campaigns.filter(c => c.id !== campaign.id)
            );
            this.showDeleteCampaignModal.set(false);
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

  private deleteAccount() {
    this.loadingState.set('loading');
    this.error.set(null);
    
    this.headerService.deleteAccount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          localStorage.removeItem('currentCampaign');
          localStorage.removeItem('currentCampaignId');
          
          this.showDeleteConfirmModal.set(false);
          this.showSettingsModal.set(false);
          
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
          this._pendingInvitations.set(invitations);
        },
        error: (err) => {
          console.error('Erreur lors du chargement des invitations:', err);
          this._pendingInvitations.set([]);
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
            this._pendingInvitations.update(invitations => 
              invitations.filter(inv => inv.id !== invitationId)
            );
            
            this.headerService.getCampaigns()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (campaigns) => {
                  this._campaigns.set(campaigns);
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
            this._pendingInvitations.update(invitations => 
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

  private canDeleteCampaign(campaign: Campaign): boolean {
    return campaign.name !== this.finalCurrentCampaign;
  }

  // === Getters pour la compatibilité avec les composants enfants ===

  get canDeleteCampaignFn() {
    return (campaign: Campaign) => this.canDeleteCampaign(campaign);
  }

  // === Méthodes pour la modal de suppression unifiée ===

  getDeleteModalTitle(): string {
    if (this.showDeleteConfirmModal()) {
      return 'Confirmer la suppression';
    } else if (this.showDeleteCampaignModal()) {
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
    if (this.showDeleteConfirmModal()) {
      return 'Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action ne peut pas être annulée.';
    } else if (this.showDeleteCampaignModal()) {
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
    if (this.showDeleteConfirmModal()) {
      this.showDeleteConfirmModal.set(false);
    } else if (this.showDeleteCampaignModal()) {
      this.showDeleteCampaignModal.set(false);
      this.campaignToDelete.set(null);
      this.error.set(null);
    }
  }

  onConfirmDelete() {
    if (this.showDeleteConfirmModal()) {
      this.deleteAccount();
    } else if (this.showDeleteCampaignModal()) {
      this.deleteCampaign();
    }
  }

  // Méthodes publiques pour exposer les signaux
  userFullName() {
    return this.finalUserFullName;
  }

  userFirstName() {
    return this.finalUserFirstName;
  }

  userLastName() {
    return this.finalUserLastName;
  }

  campaigns() {
    return this.finalCampaigns;
  }

  currentCampaign() {
    return this.finalCurrentCampaign;
  }

  pendingInvitations() {
    return this.finalPendingInvitations;
  }
} */