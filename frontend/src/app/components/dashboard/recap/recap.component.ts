import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';

import { GoalsService } from '../../../services/dashboard/goals/goals.service';
import { ActionsService } from '../../../services/dashboard/actions/actions.service';
import { Goal, GoalCard } from '../../../models/goals.model';
import { CalendarEvent } from '../../../models/event.model';

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
  private readonly actionsService = inject(ActionsService);
  private readonly destroy$ = new Subject<void>();

  // Signals pour la gestion d'état réactive
  readonly lastGoal = signal<GoalCard | null>(null);
  readonly lastEvents = signal<CalendarEvent[]>([]);
  readonly loading = signal(false);
  readonly eventsLoading = signal(false);
  readonly error = signal<string | null>(null);

  // Computed signals
  readonly hasLastGoal = computed(() => this.lastGoal() !== null);
  readonly hasLastEvents = computed(() => this.lastEvents().length > 0);

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge toutes les données nécessaires
   */
  loadData(): void {
    const currentCampaignId = localStorage.getItem('currentCampaignId');
    if (!currentCampaignId) {
      this.error.set('Aucune campagne sélectionnée');
      return;
    }

    this.loading.set(true);
    this.eventsLoading.set(true);
    this.error.set(null);

    // Charger les goals et les événements en parallèle
    forkJoin({
      goals: this.goalsService.getGoalsByCampaignId(currentCampaignId),
      eventsData: this.actionsService.getEventsWithAccess(currentCampaignId)
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.loading.set(false);
        this.eventsLoading.set(false);
      })
    ).subscribe({
      next: ({ goals, eventsData }) => {
        // Traitement des goals
        if (goals.length > 0) {
          const sortedGoals = goals.sort((a, b) => b.id.localeCompare(a.id));
          const lastGoal = this.mapGoalToCard(sortedGoals[0]);
          this.lastGoal.set(lastGoal);
        } else {
          this.lastGoal.set(null);
        }

        // Traitement des événements - récupérer les 3 derniers
        if (eventsData.events.length > 0) {
          const sortedEvents = eventsData.events
            .map(event => ({ ...event, date: new Date(event.date) }))
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 3); // Prendre les 3 derniers
          this.lastEvents.set(sortedEvents);
        } else {
          this.lastEvents.set([]);
        }
      },
      error: (error) => {
        this.error.set(error.message);
        this.lastGoal.set(null);
        this.lastEvents.set([]);
      }
    });
  }

  /**
   * Charge le dernier objectif créé (méthode originale conservée)
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
   * Charge les derniers événements
   */
  loadLastEvents(): void {
    const currentCampaignId = localStorage.getItem('currentCampaignId');
    if (!currentCampaignId) {
      this.error.set('Aucune campagne sélectionnée');
      return;
    }

    this.eventsLoading.set(true);
    this.error.set(null);

    this.actionsService.getEventsWithAccess(currentCampaignId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.eventsLoading.set(false))
      )
      .subscribe({
        next: (response) => {
          if (response.events.length > 0) {
            const sortedEvents = response.events
              .map(event => ({ ...event, date: new Date(event.date) }))
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .slice(0, 3);
            this.lastEvents.set(sortedEvents);
          } else {
            this.lastEvents.set([]);
          }
        },
        error: (error) => {
          this.error.set(error.message);
          this.lastEvents.set([]);
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
   * Recharge toutes les données
   */
  refresh(): void {
    this.loadData();
  }

  /**
   * Recharge le dernier objectif
   */
  refreshLastGoal(): void {
    this.loadLastGoal();
  }

  /**
   * Recharge les derniers événements
   */
  refreshLastEvents(): void {
    this.loadLastEvents();
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