import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';

import { GoalsCardsComponent } from '../goals-cards/goals-cards.component';
import { GoalsService } from '../../../../services/dashboard/goals/goals.service';
import { Goal, CampaignPermissions, GoalCard } from '../../../../models/goals.model';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [GoalsCardsComponent, ReactiveFormsModule, CommonModule, A11yModule],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalsComponent implements OnInit, OnDestroy {
  private readonly goalsService = inject(GoalsService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // ViewChild pour le focus automatique
  @ViewChild('firstInputAdd') firstInputAdd!: ElementRef<HTMLInputElement>;
  @ViewChild('firstInputEdit') firstInputEdit!: ElementRef<HTMLInputElement>;

  // Signals pour la gestion d'état réactive
  readonly cards = signal<GoalCard[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showAddCardModal = signal(false);
  readonly editIndex = signal<number | null>(null);
  readonly editGoalId = signal<string | null>(null);
  
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
    this.loadGoalsAndPermissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // TrackBy function pour optimiser le rendu des listes
  trackByGoalId = (index: number, goal: GoalCard): string => goal.id;

  /**
   * Charge les objectifs et les permissions de la campagne courante en parallèle
   * Utilise forkJoin pour optimiser les appels réseau
   */
  loadGoalsAndPermissions(): void {
    const currentCampaignId = localStorage.getItem('currentCampaignId');
    if (!currentCampaignId) {
      this.cards.set([]);
      this.error.set('Aucune campagne sélectionnée');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // Charge en parallèle les goals et les permissions
    forkJoin({
      goals: this.goalsService.getGoalsByCampaignId(currentCampaignId),
      permissions: this.goalsService.getCampaignPermissions(currentCampaignId)
    })
    .pipe(
      takeUntil(this.destroy$),
      finalize(() => this.loading.set(false))
    )
    .subscribe({
      next: ({ goals, permissions }) => {
        this.permissions.set(permissions);
        
        if (permissions.hasAccess) {
          const mappedCards = goals.map(goal => this.mapGoalToCard(goal));
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
   * Charge uniquement les objectifs (utilisé après les modifications CRUD)
   * Plus léger que loadGoalsAndPermissions car ne recharge pas les permissions
   */
  private loadGoals(): void {
    const currentCampaignId = localStorage.getItem('currentCampaignId');
    if (!currentCampaignId) {
      this.cards.set([]);
      this.error.set('Aucune campagne sélectionnée');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.goalsService.getGoalsByCampaignId(currentCampaignId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: (goals: Goal[]) => {
          const mappedCards = goals.map(goal => this.mapGoalToCard(goal));
          this.cards.set(mappedCards);
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors du chargement des objectifs');
          this.cards.set([]);
        }
      });
  }

  /**
   * Ouvre le modal d'ajout avec vérification des permissions et focus automatique
   */
  openAddCardModal(): void {
    if (!this.canAdd()) {
      this.error.set('Vous n\'êtes pas autorisé à ajouter des objectifs');
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
   * Ajoute un nouvel objectif avec validation complète
   */
  addCard(): void {
    if (!this.canAdd()) {
      this.error.set('Vous n\'êtes pas autorisé à ajouter des objectifs');
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

    this.goalsService.uploadGoalImage(formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.closeAddCardModal();
          this.loadGoals();
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors de l\'ajout de l\'objectif');
        }
      });
  }

  /**
   * Ouvre le modal d'édition avec pré-remplissage et focus automatique
   */
  onEditCard(index: number): void {
    if (!this.canEdit()) {
      this.error.set('Vous n\'êtes pas autorisé à modifier des objectifs');
      return;
    }
    
    const card = this.cards()[index];
    if (!card) {
      this.error.set('Objectif non trouvé');
      return;
    }

    this.editIndex.set(index);
    this.editGoalId.set(card.id);
    
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
   * Met à jour un objectif existant
   */
  updateCard(): void {
    if (!this.canEdit()) {
      this.error.set('Vous n\'êtes pas autorisé à modifier des objectifs');
      return;
    }
    
    if (this.editForm.invalid) {
      this.markFormGroupTouched(this.editForm);
      this.error.set('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    const goalId = this.editGoalId();
    if (!goalId) {
      this.error.set('Identifiant d\'objectif manquant');
      return;
    }

    const formData = this.createUpdateFormData(this.editForm.value);
    this.loading.set(true);
    this.error.set(null);

    this.goalsService.updateGoal(goalId, formData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.closeEditModal();
          this.loadGoals();
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors de la mise à jour de l\'objectif');
        }
      });
  }

  /**
   * Ferme le modal d'édition et nettoie l'état
   */
  closeEditModal(): void {
    this.editIndex.set(null);
    this.editGoalId.set(null);
    this.editImagePreview.set(null);
    this.editForm.reset();
  }

  /**
   * Supprime un objectif avec confirmation
   */
  deleteGoal(): void {
    if (!this.canEdit()) {
      this.error.set('Vous n\'êtes pas autorisé à supprimer des objectifs');
      return;
    }
    
    const goalId = this.editGoalId();
    if (!goalId) {
      this.error.set('Identifiant d\'objectif manquant');
      return;
    }

    // Confirmation de suppression
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet objectif ?')) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.goalsService.deleteGoal(goalId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          this.closeEditModal();
          this.loadGoals();
        },
        error: (error) => {
          this.error.set(error.message || 'Erreur lors de la suppression de l\'objectif');
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
   * Mappe un objet Goal vers GoalCard pour l'affichage
   */
  private mapGoalToCard(goal: Goal): GoalCard {
    let subgoals: string[] = [];
    
    try {
      if (Array.isArray(goal.subgoals)) {
        subgoals = goal.subgoals;
      } else if (typeof goal.subgoals === 'string') {
        subgoals = JSON.parse(goal.subgoals || '[]');
      }
    } catch (error) {
      console.warn('Erreur lors du parsing des sous-objectifs:', error);
      subgoals = [];
    }

    return {
      id: goal.id,
      title: goal.goals_name || 'Sans titre',
      description: goal.goals_description || '',
      items: subgoals,
      imageUrl: goal.goals_imageurl 
        ? `http://localhost:3000/uploads/goals_images/${goal.goals_imageurl}`
        : '/assets/images/placeholder-image.png' // Image de fallback
    };
  }

  /**
   * Crée un FormData pour l'ajout d'un nouvel objectif
   */
  private createFormData(formValue: any, campaignId: string): FormData {
    const formData = new FormData();
    formData.append('campaignId', campaignId);
    formData.append('title', formValue.title.trim());
    formData.append('description', (formValue.description || '').trim());
    
    // Parse et nettoie les sous-objectifs
    const items = formValue.items 
      ? formValue.items
          .split(',')
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0)
      : [];
    formData.append('subgoals', JSON.stringify(items));
    
    if (formValue.image) {
      formData.append('image', formValue.image);
    }
    
    return formData;
  }

  /**
   * Crée un FormData pour la mise à jour d'un objectif existant
   */
  private createUpdateFormData(formValue: any): FormData {
    const formData = new FormData();
    formData.append('title', formValue.title.trim());
    formData.append('description', (formValue.description || '').trim());
    
    // Parse et nettoie les sous-objectifs
    const items = formValue.items 
      ? formValue.items
          .split(',')
          .map((item: string) => item.trim())
          .filter((item: string) => item.length > 0)
      : [];
    formData.append('subgoals', JSON.stringify(items));
    
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