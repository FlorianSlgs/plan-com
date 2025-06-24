import { Component, OnInit, signal, inject, DestroyRef, output } from '@angular/core';
import { HeaderService } from '../../../services/header/header.service';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { DOCUMENT } from '@angular/common';

interface Campaign {
  id: number;
  name: string;
}

interface User {
  first_name: string;
  last_name: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private document = inject(DOCUMENT);

  logout = output<void>();
  campaignSelected = output<string>();
  accountDeleted = output<void>();
  
  // Signals pour la gestion d'état réactive
  userFullName = signal<string>('');
  campaigns = signal<Campaign[]>([]);
  currentCampaign = signal<string>('');
  showCampaignModal = signal<boolean>(false);
  showSettingsModal = signal<boolean>(false);
  showDeleteConfirmModal = signal<boolean>(false);
  showDeleteCampaignModal = signal<boolean>(false);
  campaignToDelete = signal<Campaign | null>(null);
  campaignName = signal<string>('');
  loadingState = signal<'idle' | 'loading' | 'error'>('idle');
  error = signal<string | null>(null);
  
  // Signals pour l'invitation d'utilisateurs
  inviteFormVisible = signal<number | null>(null);
  inviteEmail = signal<string>('');
  inviteRole = signal<'reader' | 'editor'>('reader');
  
  // Signal optionnel pour les messages de succès
  successMessage = signal<string>('');

  constructor(private headerService: HeaderService) {}

  ngOnInit() {
    this.loadInitialData();
    this.loadCurrentCampaign();
  }

  private loadInitialData() {
    this.loadingState.set('loading');
    
    forkJoin({
      user: this.headerService.getUserName(),
      campaigns: this.headerService.getCampaigns()
    })
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: ({ user, campaigns }) => {
        this.userFullName.set(`${user.first_name} ${user.last_name}`);
        this.campaigns.set(campaigns);
        this.loadingState.set('idle');
        this.error.set(null);
      },
      error: (err) => {
        this.userFullName.set('Utilisateur');
        this.campaigns.set([]);
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

  selectCampaign(name: string) {
    // Trouver la campagne pour récupérer son ID
    const campaign = this.campaigns().find(c => c.name === name);
    
    // Stocker le nom (comme avant)
    localStorage.setItem('currentCampaign', name);
    
    // Stocker aussi l'ID si trouvé
    if (campaign) {
      localStorage.setItem('currentCampaignId', campaign.id.toString());
    }
    
    this.currentCampaign.set(name);
    this.campaignSelected.emit(name);
    
    this.document.defaultView?.location.reload();
  }

  onLogout() {
    this.logout.emit();
  }

  // === Méthodes pour la gestion des campagnes ===
  createCampaign() {
    const name = this.campaignName().trim();
    if (!name) return;
    
    this.loadingState.set('loading');
    
    this.headerService.createCampaign(name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          // Si le serveur retourne la campagne créée avec son ID
          if (response.campaign) {
            const newCampaign: Campaign = response.campaign;
            this.campaigns.update(campaigns => [...campaigns, newCampaign]);
            this.selectCampaign(newCampaign.name);
          } else {
            // Fallback: recharger les campagnes pour obtenir la nouvelle avec son ID
            this.headerService.getCampaigns()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (campaigns) => {
                  this.campaigns.set(campaigns);
                  // Sélectionner la campagne qui vient d'être créée
                  const createdCampaign = campaigns.find(c => c.name === name);
                  if (createdCampaign) {
                    this.selectCampaign(createdCampaign.name);
                  }
                }
              });
          }
          
          this.showCampaignModal.set(false);
          this.campaignName.set('');
          this.loadingState.set('idle');
          this.error.set(null);
        },
        error: (err) => {
          this.loadingState.set('error');
          this.error.set('Erreur lors de la création de la campagne');
          console.error('Erreur création campagne:', err);
        }
      });
  }

  openCampaignModal() {
    this.showCampaignModal.set(true);
    this.campaignName.set('');
    this.error.set(null);
  }

  closeCampaignModal() {
    this.showCampaignModal.set(false);
    this.campaignName.set('');
    this.error.set(null);
  }

  openSettingsModal() {
    this.showSettingsModal.set(true);
    this.error.set(null);
    this.successMessage.set('');
    // Réinitialiser les états d'invitation
    this.inviteFormVisible.set(null);
    this.inviteEmail.set('');
    this.inviteRole.set('reader');
  }

  closeSettingsModal() {
    this.showSettingsModal.set(false);
    this.error.set(null);
    this.successMessage.set('');
    // Réinitialiser les états d'invitation
    this.inviteFormVisible.set(null);
    this.inviteEmail.set('');
    this.inviteRole.set('reader');
  }

  confirmDeleteAccount() {
    this.showDeleteConfirmModal.set(true);
  }

  closeDeleteConfirmModal() {
    this.showDeleteConfirmModal.set(false);
  }

  deleteAccount() {
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

  updateCampaignName(event: Event) {
    const target = event.target as HTMLInputElement;
    this.campaignName.set(target.value);
  }

  // === Méthodes pour la suppression de campagne ===
  
  // Méthode pour vérifier si une campagne peut être supprimée
  canDeleteCampaign(campaign: Campaign): boolean {
    return campaign.name !== this.currentCampaign();
  }

  confirmDeleteCampaign(campaign: Campaign) {
    // Vérifier si la campagne peut être supprimée
    if (!this.canDeleteCampaign(campaign)) {
      this.error.set('Impossible de supprimer la campagne actuellement sélectionnée. Veuillez d\'abord sélectionner une autre campagne.');
      return;
    }

    this.campaignToDelete.set(campaign);
    this.showDeleteCampaignModal.set(true);
    this.error.set(null);
  }

  closeDeleteCampaignModal() {
    this.showDeleteCampaignModal.set(false);
    this.campaignToDelete.set(null);
    this.error.set(null);
  }

  deleteCampaign() {
    const campaign = this.campaignToDelete();
    if (!campaign) return;

    // Double vérification de sécurité
    if (!this.canDeleteCampaign(campaign)) {
      this.error.set('Impossible de supprimer la campagne actuellement sélectionnée.');
      this.closeDeleteCampaignModal();
      return;
    }

    this.loadingState.set('loading');
    this.error.set(null);

    this.headerService.deleteCampaign(campaign.id, campaign.name)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          // Retirer la campagne de la liste
          this.campaigns.update(campaigns => 
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
  }

  // === Méthodes pour l'invitation d'utilisateurs ===
  toggleInviteForm(campaignId: number) {
    if (this.inviteFormVisible() === campaignId) {
      this.hideInviteForm();
    } else {
      this.inviteFormVisible.set(campaignId);
      this.inviteEmail.set('');
      this.inviteRole.set('reader');
      this.error.set(null);
      this.successMessage.set('');
    }
  }

  hideInviteForm() {
    this.inviteFormVisible.set(null);
    this.inviteEmail.set('');
    this.inviteRole.set('reader');
    this.error.set(null);
    this.successMessage.set('');
  }

  updateInviteEmail(event: Event) {
    const target = event.target as HTMLInputElement;
    this.inviteEmail.set(target.value);
  }

  updateInviteRole(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.inviteRole.set(target.value as 'reader' | 'editor');
  }

  sendInvitation(campaignId: number) {
    const email = this.inviteEmail();
    const role = this.inviteRole();
    
    if (!email.trim()) {
      this.error.set('L\'adresse email est requise');
      return;
    }
    
    // Validation basique de l'email
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
            // Réinitialiser le formulaire d'invitation
            this.inviteEmail.set('');
            this.inviteRole.set('reader');
            this.hideInviteForm();
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

  private clearSuccessMessage() {
    setTimeout(() => {
      this.successMessage.set('');
    }, 5000); // Effacer après 5 secondes
  }

  get dropdownOpen() { return false; }
}