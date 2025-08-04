import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil, finalize, forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';

import { GoalsService } from '../../../services/dashboard/goals/goals.service';
import { TargetsService } from '../../../services/dashboard/targets/targets.service';
import { ActionsService } from '../../../services/dashboard/actions/actions.service';
import { TaskService } from '../../../services/dashboard/tasks/task-service.service';
import { Goal, GoalCard } from '../../../models/goals.model';
import { Target, TargetCard } from '../../../models/targets.model';
import { CalendarEvent } from '../../../models/event.model';
import { Task } from '../../../models/tasks.model';

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
  private readonly targetsService = inject(TargetsService);
  private readonly actionsService = inject(ActionsService);
  private readonly taskService = inject(TaskService);
  private readonly destroy$ = new Subject<void>();

  // Signals pour la gestion d'état réactive
  readonly lastGoal = signal<GoalCard | null>(null);
  readonly lastTarget = signal<TargetCard | null>(null);
  readonly lastEvents = signal<CalendarEvent[]>([]);
  readonly lastInProgressTasks = signal<Task[]>([]);
  readonly loading = signal(false);
  readonly targetsLoading = signal(false);
  readonly eventsLoading = signal(false);
  readonly tasksLoading = signal(false);
  readonly error = signal<string | null>(null);

  // Computed signals
  readonly hasLastGoal = computed(() => this.lastGoal() !== null);
  readonly hasLastTarget = computed(() => this.lastTarget() !== null);
  readonly hasLastEvents = computed(() => this.lastEvents().length > 0);
  readonly hasLastInProgressTasks = computed(() => this.lastInProgressTasks().length > 0);

  constructor() {
    // Effect pour écouter les changements des tâches en cours
    effect(() => {
      const inProgressTasks = this.taskService.inProgressTasks();
    
      // Toujours mettre à jour les tâches et arrêter le chargement
      if (inProgressTasks.length > 0) {
        // Prendre les 2 dernières tâches
        const lastTasks = inProgressTasks.slice(-2);
        this.lastInProgressTasks.set(lastTasks);
      } else {
        // Pas de tâches en cours
        this.lastInProgressTasks.set([]);
      }
      
      // Toujours arrêter le chargement, qu'il y ait des tâches ou non
      this.tasksLoading.set(false);
    });
  }

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
    this.targetsLoading.set(true);
    this.eventsLoading.set(true);
    this.tasksLoading.set(true);
    this.error.set(null);

    // Charger les goals, les targets, les événements et les tâches en parallèle
    forkJoin({
      goals: this.goalsService.getGoalsByCampaignId(currentCampaignId),
      targets: this.targetsService.getTargetsByCampaignId(currentCampaignId),
      eventsData: this.actionsService.getEventsWithAccess(currentCampaignId)
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.loading.set(false);
        this.targetsLoading.set(false);
        this.eventsLoading.set(false);
      })
    ).subscribe({
      next: ({ goals, targets, eventsData }) => {
        // Traitement des goals
        if (goals.length > 0) {
          const sortedGoals = goals.sort((a, b) => b.id.localeCompare(a.id));
          const lastGoal = this.mapGoalToCard(sortedGoals[0]);
          this.lastGoal.set(lastGoal);
        } else {
          this.lastGoal.set(null);
        }

        // Traitement des targets
        if (targets.length > 0) {
          const sortedTargets = targets.sort((a, b) => b.id.localeCompare(a.id));
          const lastTarget = this.mapTargetToCard(sortedTargets[0]);
          this.lastTarget.set(lastTarget);
        } else {
          this.lastTarget.set(null);
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
        this.lastTarget.set(null);
        this.lastEvents.set([]);
      }
    });

    // Charger les tâches séparément
    this.loadLastInProgressTasks();
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
   * Charge la dernière cible créée
   */
  loadLastTarget(): void {
    const currentCampaignId = localStorage.getItem('currentCampaignId');
    if (!currentCampaignId) {
      this.error.set('Aucune campagne sélectionnée');
      return;
    }

    this.targetsLoading.set(true);
    this.error.set(null);

    this.targetsService.getTargetsByCampaignId(currentCampaignId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.targetsLoading.set(false))
      )
      .subscribe({
        next: (targets: Target[]) => {
          if (targets.length > 0) {
            const sortedTargets = targets.sort((a, b) => b.id.localeCompare(a.id));
            const lastTarget = this.mapTargetToCard(sortedTargets[0]);
            this.lastTarget.set(lastTarget);
          } else {
            this.lastTarget.set(null);
          }
        },
        error: (error) => {
          this.error.set(error.message);
          this.lastTarget.set(null);
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
   * Charge les 2 dernières tâches en cours
   */
  loadLastInProgressTasks(): void {
    this.tasksLoading.set(true);
    
    // Charger les tâches depuis le serveur
    this.taskService.fetchTasks();
    
    // L'effect dans le constructor va automatiquement mettre à jour les données
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
   * Recharge la dernière cible
   */
  refreshLastTarget(): void {
    this.loadLastTarget();
  }

  /**
   * Recharge les derniers événements
   */
  refreshLastEvents(): void {
    this.loadLastEvents();
  }

  /**
   * Recharge les dernières tâches en cours
   */
  refreshLastInProgressTasks(): void {
    this.loadLastInProgressTasks();
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

  /**
   * Mappe un Target en TargetCard
   */
  private mapTargetToCard(target: Target): TargetCard {
    const subtargets = Array.isArray(target.subtargets) 
      ? target.subtargets 
      : (typeof target.subtargets === 'string' 
          ? JSON.parse(target.subtargets || '[]') 
          : []);

    return {
      id: target.id,
      title: target.targets_name,
      description: target.targets_description,
      items: subtargets,
      imageUrl: `http://localhost:3000/uploads/targets_images/${target.targets_imageurl}`
    };
  }
}