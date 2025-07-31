import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, finalize } from 'rxjs';
import { RouterLink } from '@angular/router';

import { GoalsService } from '../../../services/dashboard/goals/goals.service';
import { Goal, GoalCard } from '../../../models/goals.model';

@Component({
  selector: 'app-recap',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './recap.component.html',
  styleUrl: './recap.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecapComponent implements OnInit, OnDestroy {
  private readonly goalsService = inject(GoalsService);
  private readonly destroy$ = new Subject<void>();

  // Signals pour la gestion d'état réactive
  readonly lastGoal = signal<GoalCard | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Computed signals
  readonly hasLastGoal = computed(() => this.lastGoal() !== null);

  ngOnInit(): void {
    this.loadLastGoal();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge le dernier objectif créé
   */
  loadLastGoal(): void {
    const currentCampaignId = localStorage.getItem('currentCampaignId');
    if (!currentCampaignId) {
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
          if (goals.length > 0) {
            // Trier les objectifs par ID décroissant pour obtenir le plus récent
            const sortedGoals = goals.sort((a, b) => b.id.localeCompare(a.id));
            const lastGoal = this.mapGoalToCard(sortedGoals[0]);
            this.lastGoal.set(lastGoal);
          } else {
            this.lastGoal.set(null);
          }
        },
        error: (error) => {
          this.error.set(error.message);
          this.lastGoal.set(null);
        }
      });
  }

  /**
   * Efface le message d'erreur
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Recharge le dernier objectif
   */
  refreshLastGoal(): void {
    this.loadLastGoal();
  }

  /**
   * Mappe un Goal en GoalCard
   */
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
}