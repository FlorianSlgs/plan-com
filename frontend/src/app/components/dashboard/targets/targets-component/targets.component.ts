import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { A11yModule } from '@angular/cdk/a11y';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';

import { TargetsService } from '../../../../services/dashboard/targets/targets.service';
import { TargetCard, CampaignPermissions, Target } from '../../../../models/targets.model';

import { TargetsCardsComponent } from '../targets-cards/targets-cards.component';

// Import de l'environnement
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-targets',
  imports: [TargetsCardsComponent, ReactiveFormsModule, A11yModule],
  templateUrl: './targets.component.html',
  styleUrl: './targets.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TargetsComponent implements OnInit, OnDestroy {
  private readonly targetsService = inject(TargetsService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // ViewChild pour le focus automatique
  @ViewChild('firstInputAdd') firstInputAdd!: ElementRef<HTMLInputElement>;
  @ViewChild('firstInputEdit') firstInputEdit!: ElementRef<HTMLInputElement>;

  // Signals pour la gestion d'état réactive
  readonly cards = signal<TargetCard[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showAddCardModal = signal(false);
  readonly editIndex = signal<number | null>(null);
  readonly editTargetId = signal<string | null>(null);
  
  // Signal pour les permissions de campagne
  readonly permissions = signal<CampaignPermissions>({
    hasAccess: false,
    isOwner: false,
    isReadOnly: true
  });

  // Computed signals pour l'état dérivé
  readonly hasCards = computed(() => this.cards().length > 0);
  readonly isEditing = computed(() => this.editIndex() !== null);
  readonly canEdit = computed(() => this.permissions().hasAccess && !this.permissions().isReadOnly);
  readonly canAdd = computed(() => this.permissions().hasAccess && !this.permissions().isReadOnly);

  // Formulaires réactifs
  readonly addForm: FormGroup;
  readonly editForm: FormGroup;

  // Previews d'images
  readonly imagePreview = signal<string | null>(null);
  readonly editImagePreview = signal<string | null>(null);

  constructor() {
    this.addForm = this.createAddForm();
    this.editForm = this.createEditForm();
  }

  ngOnInit(): void {
    this.loadTargetsAndPermissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // TrackBy function pour optimiser le rendu des listes
  trackByTargetId = (index: number, target: TargetCard): string => target.id;

  /**
   * Charge les cibles et les permissions de la campagne courante en parallèle
   * Utilise forkJoin pour optimiser les appels réseau
   */
  loadTargetsAndPermissions(): void {
    const currentCampaignId = localStorage.getItem('currentCampaignId');
    if (!currentCampaignId) {
      this.cards.set([]);
      this.error.set('Aucune campagne sélectionnée');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Charge en parallèle les targets et les permissions
    forkJoin({
      targets: this.targetsService.getTargetsByCampaignId(currentCampaignId),
      permissions: this.targetsService.getCampaignPermissions(currentCampaignId)
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading.set(false))
    )
    .subscribe({
      next: ({ targets, permissions }) => {
        this.permissions.set(permissions);
        
        if (permissions.hasAccess) {
          const mappedCards = targets.map(target => this.mapTargetToCard(target));
          this.cards.set(mappedCards);
        } else {
          this.cards.set([]);
          this.error.set('Vous n\'avez pas accès à cette campagne');
        }
      },
      error: (error) => {
        this.error.set(error.message || 'Erreur lors du chargement des données');
        this.cards.set([]);
        this.permissions.set({
          hasAccess: false,
          isOwner: false,
          isReadOnly: true
        });
      }
    });
  }

  /**
   * Charge uniquement les cibles (utilisé après les modifications CRUD)
   * Plus léger que loadTargetsAndPermissions car ne recharge pas les permissions
   */
  private loadTargets(): void {
    const currentCampaignId = localStorage.getItem('currentCampaignId');
    if (!currentCampaignId) {
      this.cards.set([]);
      this.error.set('Aucune campagne sélectionnée');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.targetsService.getTargetsByCampaignId(currentCampaignId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (targets: Target[]) => {
          const mappedCards = targets.map(target => this.mapTargetToCard(target));
          this.cards.set(mappedCards);
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors du chargement des cibles');
          this.cards.set([]);
        }
      });
  }

  /**
   * Ouvre le modal d'ajout avec vérification des permissions et focus automatique
   */
  openAddCardModal(): void {
    if (!this.canAdd()) {
      this.error.set('Vous n\'êtes pas autorisé à ajouter des cibles');
      return;
    }
    
    this.showAddCardModal.set(true);
    this.addForm.reset();
    this.imagePreview.set(null);

    // Focus automatique sur le premier champ après ouverture du modal
    setTimeout(() => {
      if (this.firstInputAdd?.nativeElement) {
        this.firstInputAdd.nativeElement.focus();
      }
    }, 100);
  }

  /**
   * Ferme le modal d'ajout et nettoie l'état
   */
  closeAddCardModal(): void {
    this.showAddCardModal.set(false);
    this.imagePreview.set(null);
    this.addForm.reset();
  }

  /**
   * Gestion de la sélection de fichier pour l'ajout avec validation
   */
  onFileSelected(event: Event): void {
    if (!this.canAdd()) return;
    
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file && this.validateImageFile(file)) {
      this.addForm.patchValue({ image: file });
      this.generateImagePreview(file, this.imagePreview);
    }
  }

  /**
   * Gestion du drag & drop pour l'ajout
   */
  onDragOver(event: DragEvent): void {
    if (!this.canAdd()) return;
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    if (!this.canAdd()) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.dataTransfer?.files[0];
    
    if (file && this.validateImageFile(file)) {
      this.addForm.patchValue({ image: file });
      this.generateImagePreview(file, this.imagePreview);
    }
  }

  /**
   * Ajoute une nouvelle cible avec validation complète
   */
  addCard(): void {
    if (!this.canAdd()) {
      this.error.set('Vous n\'êtes pas autorisé à ajouter des cibles');
      return;
    }
    
    if (this.addForm.invalid) {
      this.markFormGroupTouched(this.addForm);
      this.error.set('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    const currentCampaignId = localStorage.getItem('currentCampaignId');
    if (!currentCampaignId) {
      this.error.set('Aucune campagne sélectionnée');
      return;
    }

    const formData = this.createFormData(this.addForm.value, currentCampaignId);
    this.loading.set(true);
    this.error.set(null);

    this.targetsService.uploadTargetImage(formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.closeAddCardModal();
          this.loadTargets();
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors de l\'ajout de la cible');
        }
      });
  }

  /**
   * Ouvre le modal d'édition avec pré-remplissage et focus automatique
   */
  onEditCard(index: number): void {
    if (!this.canEdit()) {
      this.error.set('Vous n\'êtes pas autorisé à modifier des cibles');
      return;
    }
    
    const card = this.cards()[index];
    if (!card) {
      this.error.set('Cible non trouvée');
      return;
    }

    this.editIndex.set(index);
    this.editTargetId.set(card.id);
    
    // Pré-remplit le formulaire d'édition
    this.editForm.patchValue({
      title: card.title,
      description: card.description,
      items: card.items.join(', ')
    });
    
    this.editImagePreview.set(card.imageUrl);

    // Focus automatique sur le premier champ après ouverture du modal
    setTimeout(() => {
      if (this.firstInputEdit?.nativeElement) {
        this.firstInputEdit.nativeElement.focus();
      }
    }, 100);
  }

  /**
   * Gestion de la sélection de fichier pour l'édition
   */
  onEditFileSelected(event: Event): void {
    if (!this.canEdit()) return;
    
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file && this.validateImageFile(file)) {
      this.editForm.patchValue({ image: file });
      this.generateImagePreview(file, this.editImagePreview);
    }
  }

  /**
   * Gestion du drag & drop pour l'édition
   */
  onEditDrop(event: DragEvent): void {
    if (!this.canEdit()) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.dataTransfer?.files[0];
    
    if (file && this.validateImageFile(file)) {
      this.editForm.patchValue({ image: file });
      this.generateImagePreview(file, this.editImagePreview);
    }
  }

  /**
   * Met à jour une cible existante
   */
  updateCard(): void {
    if (!this.canEdit()) {
      this.error.set('Vous n\'êtes pas autorisé à modifier des cibles');
      return;
    }
    
    if (this.editForm.invalid) {
      this.markFormGroupTouched(this.editForm);
      this.error.set('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    const targetId = this.editTargetId();
    if (!targetId) {
      this.error.set('Identifiant de cible manquant');
      return;
    }

    const formData = this.createUpdateFormData(this.editForm.value);
    this.loading.set(true);
    this.error.set(null);

    this.targetsService.updateTarget(targetId, formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.closeEditModal();
          this.loadTargets();
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors de la mise à jour de la cible');
        }
      });
  }

  /**
   * Ferme le modal d'édition et nettoie l'état
   */
  closeEditModal(): void {
    this.editIndex.set(null);
    this.editTargetId.set(null);
    this.editImagePreview.set(null);
    this.editForm.reset();
  }

  /**
   * Supprime une cible avec confirmation
   */
  deleteTarget(): void {
    if (!this.canEdit()) {
      this.error.set('Vous n\'êtes pas autorisé à supprimer des cibles');
      return;
    }
    
    const targetId = this.editTargetId();
    if (!targetId) {
      this.error.set('Identifiant de cible manquant');
      return;
    }

    // Confirmation de suppression (optionnel: peut être remplacé par un modal de confirmation)
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette cible ?')) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.targetsService.deleteTarget(targetId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.closeEditModal();
          this.loadTargets();
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors de la suppression de la cible');
        }
      });
  }

  /**
   * Efface le message d'erreur
   */
  clearError(): void {
    this.error.set(null);
  }

  // ===================
  // MÉTHODES PRIVÉES
  // ===================

  /**
   * Crée le formulaire d'ajout avec validations
   */
  private createAddForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      items: ['', [Validators.maxLength(1000)]],
      image: [null, Validators.required]
    });
  }

  /**
   * Crée le formulaire d'édition avec validations
   */
  private createEditForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      items: ['', [Validators.maxLength(1000)]],
      image: [null] // Optionnel pour l'édition
    });
  }

  /**
   * Mappe un objet Target vers TargetCard pour l'affichage
   */
  private mapTargetToCard(target: Target): TargetCard {
    let subtargets: string[] = [];
    
    try {
      if (Array.isArray(target.subtargets)) {
        subtargets = target.subtargets;
      } else if (typeof target.subtargets === 'string') {
        subtargets = JSON.parse(target.subtargets || '[]');
      }
    } catch (error) {
      console.warn('Erreur lors du parsing des sous-cibles:', error);
      subtargets = [];
    }

    return {
      id: target.id,
      title: target.targets_name || 'Sans titre',
      description: target.targets_description || '',
      items: subtargets,
      // Utilisation de environment.baseUrl
      imageUrl: target.targets_imageurl 
        ? `${environment.baseUrl.replace('/api', '')}/uploads/targets_images/${target.targets_imageurl}`
        : '/assets/images/placeholder-image.png' // Image de fallback
    };
  }

  /**
   * Crée un FormData pour l'ajout d'une nouvelle cible
   */
  private createFormData(formValue: any, campaignId: string): FormData {
    const formData = new FormData();
    formData.append('campaignId', campaignId);
    formData.append('title', formValue.title.trim());
    formData.append('description', (formValue.description || '').trim());
    
    // Parse et nettoie les sous-cibles
    const items = formValue.items 
      ? formValue.items
          .split(',')
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0)
      : [];
    formData.append('subtargets', JSON.stringify(items));
    
    if (formValue.image) {
      formData.append('image', formValue.image);
    }
    
    return formData;
  }

  /**
   * Crée un FormData pour la mise à jour d'une cible existante
   */
  private createUpdateFormData(formValue: any): FormData {
    const formData = new FormData();
    formData.append('title', formValue.title.trim());
    formData.append('description', (formValue.description || '').trim());
    
    // Parse et nettoie les sous-cibles
    const items = formValue.items 
      ? formValue.items
          .split(',')
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0)
      : [];
    formData.append('subtargets', JSON.stringify(items));
    
    // L'image n'est ajoutée que si elle a été modifiée
    if (formValue.image) {
      formData.append('image', formValue.image);
    }
    
    return formData;
  }

  /**
   * Génère un aperçu de l'image sélectionnée
   */
  private generateImagePreview(file: File, previewSignal: any): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      previewSignal.set(e.target.result);
    };
    reader.onerror = () => {
      this.error.set('Erreur lors de la lecture de l\'image');
    };
    reader.readAsDataURL(file);
  }

  /**
   * Marque tous les contrôles d'un formulaire comme touchés pour afficher les erreurs
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  /**
   * Valide le type et la taille d'un fichier image
   */
  private validateImageFile(file: File): boolean {
    // Vérifier le type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.error.set('Type de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.');
      return false;
    }

    // Vérifier la taille (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB en bytes
    if (file.size > maxSize) {
      this.error.set('L\'image est trop volumineuse. Taille maximale: 5MB.');
      return false;
    }

    return true;
  }
}