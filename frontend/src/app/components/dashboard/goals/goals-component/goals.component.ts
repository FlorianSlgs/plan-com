import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';

import { GoalsCardsComponent } from '../goals-cards/goals-cards.component';
import { GoalsService } from '../../../../services/dashboard/goals/goals.service';
import { Goal, CampaignPermissions,GoalCard } from '../../../../models/goals.model';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [GoalsCardsComponent, ReactiveFormsModule, CommonModule],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GoalsComponent implements OnInit, OnDestroy {
  private readonly goalsService = inject(GoalsService);
  private readonly fb = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  // Signals pour la gestion d'état réactive
  readonly cards = signal<GoalCard[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showAddCardModal = signal(false);
  readonly editIndex = signal<number | null>(null);
  readonly editGoalId = signal<string | null>(null);
  
  // Nouveau signal pour les permissions
  readonly permissions = signal<CampaignPermissions>({
    hasAccess: false,
    isOwner: false,
    isReadOnly: true
  });

  // Computed signals
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

  // TrackBy function pour optimiser le rendu
  trackByGoalId = (index: number, goal: GoalCard): string => goal.id;

  /**
   * Charge les objectifs et les permissions de la campagne courante
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
        this.error.set(error.message);
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
   * Charge seulement les objectifs (utilisé après les modifications)
   */
  loadGoals(): void {
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
          this.error.set(error.message);
          this.cards.set([]);
        }
      });
  }

  /**
   * Ouvre le modal d'ajout (seulement si autorisé)
   */
  openAddCardModal(): void {
    if (!this.canAdd()) {
      this.error.set('Vous n\'êtes pas autorisé à ajouter des objectifs');
      return;
    }
    
    this.showAddCardModal.set(true);
    this.addForm.reset();
    this.imagePreview.set(null);
  }

  /**
   * Ferme le modal d'ajout
   */
  closeAddCardModal(): void {
    this.showAddCardModal.set(false);
    this.imagePreview.set(null);
  }

  /**
   * Gestion de sélection de fichier pour l'ajout
   */
  onFileSelected(event: Event): void {
    if (!this.canAdd()) return;
    
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
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
  }

  onDrop(event: DragEvent): void {
    if (!this.canAdd()) return;
    
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    
    if (file) {
      this.addForm.patchValue({ image: file });
      this.generateImagePreview(file, this.imagePreview);
    }
  }

  /**
   * Ajoute une nouvelle carte (seulement si autorisé)
   */
  addCard(): void {
    if (!this.canAdd()) {
      this.error.set('Vous n\'êtes pas autorisé à ajouter des objectifs');
      return;
    }
    
    if (this.addForm.invalid) {
      this.markFormGroupTouched(this.addForm);
      return;
    }

    const currentCampaignId = localStorage.getItem('currentCampaignId');
    if (!currentCampaignId) {
      this.error.set('Aucune campagne sélectionnée');
      return;
    }

    const formData = this.createFormData(this.addForm.value, currentCampaignId);
    this.loading.set(true);

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
          this.error.set(error.message);
        }
      });
  }

  /**
   * Ouvre le modal d'édition (seulement si autorisé)
   */
  onEditCard(index: number): void {
    if (!this.canEdit()) {
      this.error.set('Vous n\'êtes pas autorisé à modifier des objectifs');
      return;
    }
    
    const card = this.cards()[index];
    if (!card) return;

    this.editIndex.set(index);
    this.editGoalId.set(card.id);
    
    this.editForm.patchValue({
      title: card.title,
      description: card.description,
      items: card.items.join(', ')
    });
    
    this.editImagePreview.set(card.imageUrl);
  }

  /**
   * Gestion de sélection de fichier pour l'édition
   */
  onEditFileSelected(event: Event): void {
    if (!this.canEdit()) return;
    
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
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
    const file = event.dataTransfer?.files[0];
    
    if (file) {
      this.editForm.patchValue({ image: file });
      this.generateImagePreview(file, this.editImagePreview);
    }
  }

  /**
   * Met à jour une carte (seulement si autorisé)
   */
  updateCard(): void {
    if (!this.canEdit()) {
      this.error.set('Vous n\'êtes pas autorisé à modifier des objectifs');
      return;
    }
    
    if (this.editForm.invalid) {
      this.markFormGroupTouched(this.editForm);
      return;
    }

    const goalId = this.editGoalId();
    if (!goalId) return;

    const formData = this.createUpdateFormData(this.editForm.value);
    this.loading.set(true);

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
          this.error.set(error.message);
        }
      });
  }

  /**
   * Ferme le modal d'édition
   */
  closeEditModal(): void {
    this.editIndex.set(null);
    this.editGoalId.set(null);
    this.editImagePreview.set(null);
    this.editForm.reset();
  }

  /**
   * Supprime un objectif (seulement si autorisé)
   */
  deleteGoal(): void {
    if (!this.canEdit()) {
      this.error.set('Vous n\'êtes pas autorisé à supprimer des objectifs');
      return;
    }
    
    const goalId = this.editGoalId();
    if (!goalId) return;

    this.loading.set(true);

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
          this.error.set(error.message);
        }
      });
  }

  /**
   * Efface le message d'erreur
   */
  clearError(): void {
    this.error.set(null);
  }

  // Méthodes privées utilitaires (inchangées)

  private createAddForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      items: [''],
      image: [null, Validators.required]
    });
  }

  private createEditForm(): FormGroup {
    return this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      items: [''],
      image: [null]
    });
  }

  private mapGoalToCard(goal: Goal): GoalCard {
    const subgoals = Array.isArray(goal.subgoals) 
      ? goal.subgoals 
      : (typeof goal.subgoals === 'string' 
          ? JSON.parse(goal.subgoals || '[]') 
          : []);

    return {
      id: goal.id,
      title: goal.goals_name,
      description: goal.goals_description,
      items: subgoals,
      imageUrl: `http://localhost:3000/uploads/goals_images/${goal.goals_imageurl}`
    };
  }

  private createFormData(formValue: any, campaignId: string): FormData {
    const formData = new FormData();
    formData.append('campaignId', campaignId);
    formData.append('title', formValue.title);
    formData.append('description', formValue.description || '');
    
    const items = formValue.items 
      ? formValue.items.split(',').map((item: string) => item.trim()).filter(Boolean)
      : [];
    formData.append('subgoals', JSON.stringify(items));
    
    if (formValue.image) {
      formData.append('image', formValue.image);
    }
    
    return formData;
  }

  private createUpdateFormData(formValue: any): FormData {
    const formData = new FormData();
    formData.append('title', formValue.title);
    formData.append('description', formValue.description || '');
    
    const items = formValue.items 
      ? formValue.items.split(',').map((item: string) => item.trim()).filter(Boolean)
      : [];
    formData.append('subgoals', JSON.stringify(items));
    
    if (formValue.image) {
      formData.append('image', formValue.image);
    }
    
    return formData;
  }

  private generateImagePreview(file: File, previewSignal: any): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      previewSignal.set(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }
}