import { Component, input, output, signal, effect, ViewChild, ElementRef, OnInit, OnDestroy, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { A11yModule } from '@angular/cdk/a11y';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Modèles
import { Campaign, InviteUserData, PendingInvitation, CampaignUser, RevokeAccessData } from '../../../../../models/campaign.model';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [FormsModule, A11yModule],
  templateUrl: './settings-modal.component.html',
  styleUrl: './settings-modal.component.scss'
})
export class SettingsModalComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  // ViewChild pour le focus automatique
  @ViewChild('inviteEmailInput') inviteEmailInput!: ElementRef<HTMLInputElement>;

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
  campaignUsers = input.required<(campaignId: number) => CampaignUser[]>();

  // Nouvelles options de configuration
  autoFocus = input<boolean>(true);
  preventEscapeClose = input<boolean>(false);
  preventBackdropClose = input<boolean>(false);

  // Outputs - événements émis vers le composant parent
  close = output<void>();
  deleteAccount = output<void>();
  deleteCampaign = output<Campaign>();
  inviteUser = output<InviteUserData>();
  acceptInvitation = output<number>();
  rejectInvitation = output<number>();
  loadCampaignUsers = output<number>();
  revokeAccess = output<RevokeAccessData>();

  // État local du composant pour les invitations
  inviteFormVisible = signal<number | null>(null);
  inviteEmail = signal<string>('');
  inviteRole = signal<'reader' | 'editor'>('reader');
  
  // État pour la gestion du focus
  private previousActiveElement: Element | null = null;
  private isSubmittingInvite = signal<boolean>(false);
  private isProcessingAction = signal<boolean>(false);

  // Computed signals pour la validation
  isInviteFormValid = computed(() => {
    return this.inviteEmail().trim().length > 0 && 
           this.isValidEmail(this.inviteEmail());
  });

  canSubmitInvite = computed(() => {
    return this.isInviteFormValid() && 
           this.loadingState() !== 'loading' && 
           !this.isSubmittingInvite();
  });

  canProcessActions = computed(() => {
    return this.loadingState() !== 'loading' && 
           !this.isProcessingAction();
  });

  // Computed pour les statistiques
  totalInvitations = computed(() => this.pendingInvitations().length);
  totalCampaigns = computed(() => this.campaigns().length);
  ownedCampaigns = computed(() => 
    this.campaigns().filter(c => c.user_role === 'owner').length
  );
  sharedCampaigns = computed(() => 
    this.campaigns().filter(c => c.user_role !== 'owner').length
  );

  constructor() {
    // Effect pour gérer l'ouverture/fermeture du modal
    effect(() => {
      if (this.isOpen()) {
        this.onModalOpen();
      } else {
        this.onModalClose();
      }
    });

    // Réinitialiser l'état quand la modal se ferme
    effect(() => {
      if (!this.isOpen()) {
        this.resetAllState();
      }
    });
  }

  ngOnInit(): void {
    // Sauvegarde l'élément actif avant l'ouverture du modal
    this.previousActiveElement = document.activeElement;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Restaure le focus si nécessaire lors de la destruction du composant
    this.restorePreviousFocus();
    // Réactive le scroll du body
    document.body.style.overflow = '';
  }

  // ===================
  // GESTION DU MODAL
  // ===================

  /**
   * Appelé lors de l'ouverture du modal
   */
  private onModalOpen(): void {
    // Sauvegarde l'élément actif
    this.previousActiveElement = document.activeElement;
    
    // Désactive le scroll du body
    document.body.style.overflow = 'hidden';
    
    // Charge les statistiques initiales si nécessaire
    this.loadInitialData();
  }

  /**
   * Appelé lors de la fermeture du modal
   */
  private onModalClose(): void {
    // Réactive le scroll du body
    document.body.style.overflow = '';
    
    // Restaure le focus sur l'élément précédent
    this.restorePreviousFocus();
    
    // Remet à zéro les états de soumission
    this.isSubmittingInvite.set(false);
    this.isProcessingAction.set(false);
  }

  /**
   * Restaure le focus sur l'élément qui était actif avant l'ouverture du modal
   */
  private restorePreviousFocus(): void {
    if (this.previousActiveElement && typeof (this.previousActiveElement as any).focus === 'function') {
      (this.previousActiveElement as any).focus();
    }
  }

  /**
   * Charge les données initiales nécessaires
   */
  private loadInitialData(): void {
    // Charge les utilisateurs des campagnes visibles si nécessaire
    this.campaigns().forEach(campaign => {
      if (campaign.user_role === 'owner' && this.inviteFormVisible() === campaign.id) {
        this.onLoadCampaignUsers(campaign.id);
      }
    });
  }

  /**
   * Remet à zéro tout l'état du modal
   */
  private resetAllState(): void {
    this.resetInviteForm();
    this.isSubmittingInvite.set(false);
    this.isProcessingAction.set(false);
  }

  // ===================
  // GESTION DES ÉVÉNEMENTS
  // ===================

  /**
   * Ferme le modal si possible
   */
  onClose(): void {
    if (this.canClose()) {
      this.close.emit();
    }
  }

  /**
   * Gère la suppression de compte
   */
  onDeleteAccount(): void {
    if (!this.canProcessActions()) {
      return;
    }

    // Confirmation de suppression
    if (confirm('Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Cette action ne peut pas être annulée.')) {
      this.isProcessingAction.set(true);
      this.deleteAccount.emit();
      
      // Remet à zéro l'état après un délai
      setTimeout(() => {
        this.isProcessingAction.set(false);
      }, 2000);
    }
  }

  /**
   * Gère la suppression/quitter d'une campagne
   */
  onDeleteCampaign(campaign: Campaign): void {
    if (!this.canProcessActions() || !this.canDeleteCampaign()(campaign)) {
      return;
    }

    const action = campaign.user_role === 'owner' ? 'supprimer' : 'quitter';
    const message = `Êtes-vous sûr de vouloir ${action} cette campagne ?`;
    
    if (confirm(message)) {
      this.isProcessingAction.set(true);
      this.deleteCampaign.emit(campaign);
      
      // Remet à zéro l'état après un délai
      setTimeout(() => {
        this.isProcessingAction.set(false);
      }, 2000);
    }
  }

  /**
   * Accepte une invitation
   */
  onAcceptInvitation(invitationId: number): void {
    if (!this.canProcessActions()) {
      return;
    }

    this.isProcessingAction.set(true);
    this.acceptInvitation.emit(invitationId);
    
    // Remet à zéro l'état après un délai
    setTimeout(() => {
      this.isProcessingAction.set(false);
    }, 2000);
  }

  /**
   * Refuse une invitation
   */
  onRejectInvitation(invitationId: number): void {
    if (!this.canProcessActions()) {
      return;
    }

    if (confirm('Êtes-vous sûr de vouloir refuser cette invitation ?')) {
      this.isProcessingAction.set(true);
      this.rejectInvitation.emit(invitationId);
      
      // Remet à zéro l'état après un délai
      setTimeout(() => {
        this.isProcessingAction.set(false);
      }, 2000);
    }
  }

  /**
   * Charge les utilisateurs d'une campagne
   */
  onLoadCampaignUsers(campaignId: number): void {
    this.loadCampaignUsers.emit(campaignId);
  }

  /**
   * Révoque l'accès d'un utilisateur
   */
  onRevokeAccess(userId: number, campaignId: number): void {
    if (!this.canProcessActions()) {
      return;
    }

    if (confirm('Êtes-vous sûr de vouloir révoquer l\'accès de cet utilisateur ?')) {
      this.isProcessingAction.set(true);
      this.revokeAccess.emit({ userId, campaignId });
      
      // Remet à zéro l'état après un délai
      setTimeout(() => {
        this.isProcessingAction.set(false);
      }, 2000);
    }
  }

  /**
   * Gère les événements clavier pour l'accessibilité
   */
  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        if (!this.preventEscapeClose()) {
          event.preventDefault();
          this.onClose();
        }
        break;
        
      case 'Enter':
        // Empêche la soumission accidentelle pendant le chargement
        if (this.loadingState() === 'loading') {
          event.preventDefault();
        }
        break;
        
      default:
        break;
    }
  }

  /**
   * Gère les clics sur l'overlay (backdrop)
   */
  onBackdropClick(event: Event): void {
    // Ne ferme que si le clic est sur l'overlay et si autorisé
    if (event.target === event.currentTarget && !this.preventBackdropClose()) {
      this.onClose();
    }
  }

  // ===================
  // GESTION DES INVITATIONS
  // ===================

  /**
   * Bascule l'affichage du formulaire d'invitation
   */
  toggleInviteForm(campaignId: number): void {
    if (this.inviteFormVisible() === campaignId) {
      this.hideInviteForm();
    } else {
      this.showInviteForm(campaignId);
      // Charger les utilisateurs de la campagne quand on ouvre le formulaire
      this.onLoadCampaignUsers(campaignId);
    }
  }

  /**
   * Affiche le formulaire d'invitation avec focus automatique
   */
  showInviteForm(campaignId: number): void {
    this.inviteFormVisible.set(campaignId);
    this.inviteEmail.set('');
    this.inviteRole.set('reader');

    // Focus automatique sur le champ email après un court délai
    setTimeout(() => {
      if (this.inviteEmailInput?.nativeElement) {
        this.inviteEmailInput.nativeElement.focus();
      }
    }, 100);
  }

  /**
   * Cache le formulaire d'invitation
   */
  hideInviteForm(): void {
    this.inviteFormVisible.set(null);
    this.resetInviteForm();
  }

  /**
   * Remet à zéro le formulaire d'invitation
   */
  private resetInviteForm(): void {
    this.inviteEmail.set('');
    this.inviteRole.set('reader');
    this.inviteFormVisible.set(null);
    this.isSubmittingInvite.set(false);
  }

  /**
   * Gère le changement de l'email d'invitation
   */
  onInviteEmailChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.inviteEmail.set(target.value.trim());
  }

  /**
   * Gère le changement du rôle d'invitation
   */
  onInviteRoleChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.inviteRole.set(target.value as 'reader' | 'editor');
  }

  /**
   * Envoie une invitation
   */
  onSendInvitation(campaignId: number): void {
    // Empêche la double soumission
    if (this.isSubmittingInvite() || this.loadingState() === 'loading') {
      return;
    }

    const email = this.inviteEmail().trim();
    const role = this.inviteRole();
    
    if (!email || !this.isValidEmail(email)) {
      this.focusEmailInput();
      return;
    }

    // Marque comme en cours de soumission
    this.isSubmittingInvite.set(true);

    this.inviteUser.emit({
      email,
      campaignId,
      role
    });

    // Remet à zéro l'état après un délai
    setTimeout(() => {
      this.isSubmittingInvite.set(false);
    }, 2000);
  }

  // ===================
  // MÉTHODES UTILITAIRES
  // ===================

  /**
   * Vérifie si le modal peut être fermé
   */
  canClose(): boolean {
    return this.loadingState() !== 'loading' && 
           !this.isSubmittingInvite() &&
           !this.isProcessingAction();
  }

  /**
   * Met le focus sur le champ email
   */
  focusEmailInput(): void {
    setTimeout(() => {
      if (this.inviteEmailInput?.nativeElement) {
        this.inviteEmailInput.nativeElement.focus();
      }
    }, 0);
  }

  /**
   * Vérifie si l'email est valide
   */
  isValidEmail(email: string): boolean {
    if (!email || email.trim().length === 0) {
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Retourne le texte d'affichage du rôle
   */
  getRoleDisplayText(role: 'reader' | 'editor'): string {
    return role === 'reader' ? 'Lecteur' : 'Éditeur';
  }

  /**
   * Retourne la classe CSS du badge de rôle
   */
  getRoleBadgeClass(role: 'reader' | 'editor'): string {
    return role === 'reader' 
      ? 'bg-blue-100 text-blue-700' 
      : 'bg-purple-100 text-purple-700';
  }

  /**
   * Retourne le texte d'affichage du créateur
   */
  getCreatorDisplayText(campaign: Campaign): string {
    if (campaign.user_role === 'owner') {
      return 'Créée par vous';
    } else if (campaign.first_name && campaign.last_name) {
      return `Créée par ${campaign.first_name} ${campaign.last_name}`;
    } else {
      return 'Campagne partagée';
    }
  }

  /**
   * Retourne le texte du bouton d'action
   */
  getActionButtonText(campaign: Campaign): string {
    return campaign.user_role === 'owner' ? 'Supprimer' : 'Quitter';
  }

  /**
   * Retourne le titre du bouton d'action
   */
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

  /**
   * Retourne l'état aria-busy pour l'accessibilité
   */
  getAriaBusy(): boolean {
    return this.loadingState() === 'loading' || 
           this.isSubmittingInvite() || 
           this.isProcessingAction();
  }

  /**
   * Valide un email avec des règles renforcées
   */
  validateEmail(email: string): { valid: boolean; error?: string } {
    const trimmedEmail = email.trim();
    
    if (trimmedEmail.length === 0) {
      return { valid: false, error: 'L\'adresse email est requise' };
    }
    
    if (trimmedEmail.length > 254) {
      return { valid: false, error: 'L\'adresse email est trop longue' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return { valid: false, error: 'Format d\'adresse email invalide' };
    }
    
    return { valid: true };
  }

  /**
   * Filtre les campagnes par type
   */
  getCampaignsByType(type: 'owned' | 'shared'): Campaign[] {
    return this.campaigns().filter(campaign => 
      type === 'owned' ? campaign.user_role === 'owner' : campaign.user_role !== 'owner'
    );
  }

  /**
   * Recherche des campagnes par nom
   */
  searchCampaigns(query: string): Campaign[] {
    if (!query.trim()) {
      return this.campaigns();
    }
    
    const searchTerm = query.toLowerCase().trim();
    return this.campaigns().filter(campaign =>
      campaign.name.toLowerCase().includes(searchTerm) ||
      this.getCreatorDisplayText(campaign).toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Trie les campagnes par différents critères
   */
  sortCampaigns(campaigns: Campaign[], sortBy: 'name' | 'role' | 'date'): Campaign[] {
    return [...campaigns].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'role':
          // Propriétaires en premier
          if (a.user_role === 'owner' && b.user_role !== 'owner') return -1;
          if (a.user_role !== 'owner' && b.user_role === 'owner') return 1;
          return a.name.localeCompare(b.name);
        case 'date':
          // Plus récentes en premier (si vous avez une date de création)
          return a.name.localeCompare(b.name); // Fallback sur le nom
        default:
          return 0;
      }
    });
  }

  /**
   * Exporte les statistiques des campagnes
   */
  exportCampaignStats(): string {
    const stats = {
      totalCampaigns: this.totalCampaigns(),
      ownedCampaigns: this.ownedCampaigns(),
      sharedCampaigns: this.sharedCampaigns(),
      pendingInvitations: this.totalInvitations(),
      campaigns: this.campaigns().map(campaign => ({
        name: campaign.name,
        role: campaign.user_role,
        creator: this.getCreatorDisplayText(campaign),
        isCurrent: campaign.name === this.currentCampaign()
      }))
    };
    
    return JSON.stringify(stats, null, 2);
  }

  /**
   * Retourne un résumé des permissions pour une campagne
   */
  getCampaignPermissionsSummary(campaign: Campaign): string {
    const isOwner = campaign.user_role === 'owner';
    const permissions: string[] = [];
    
    if (isOwner) {
      permissions.push('Propriétaire');
      permissions.push('Peut inviter des utilisateurs');
      permissions.push('Peut supprimer la campagne');
    } else {
      permissions.push(this.getRoleDisplayText(campaign.user_role as 'reader' | 'editor'));
      permissions.push('Peut quitter la campagne');
    }
    
    return permissions.join(' • ');
  }
}