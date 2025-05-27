import { Injectable, signal, WritableSignal, computed } from '@angular/core';
import { Task } from '../task.model';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private tasks: WritableSignal<Task[]> = signal<Task[]>([]);

  // Tâches publiques en lecture seule
  public readonly allTasks = this.tasks.asReadonly();

  // Tâches par statut pour le Kanban (calculées)
  public readonly todoTasks = computed(() => this.tasks().filter(task => task.status === 'todo'));
  public readonly inProgressTasks = computed(() => this.tasks().filter(task => task.status === 'inProgress'));
  public readonly doneTasks = computed(() => this.tasks().filter(task => task.status === 'done'));

  constructor() {
    // Exemple de données initiales
    this.tasks.set([
      { id: '1', title: 'Conception initiale', status: 'done', startDate: new Date('2025-05-01'), endDate: new Date('2025-05-05') },
      { id: '2', title: 'Développement API', status: 'inProgress', startDate: new Date('2025-05-06'), endDate: new Date('2025-05-15'), assignee: 'Alice' },
      { id: '3', title: 'Tests Unitaires', status: 'todo', startDate: new Date('2025-05-16'), endDate: new Date('2025-05-20') },
      { id: '4', title: 'Déploiement', status: 'todo', priority: 'high' },
    ]);
  }

  addTask(taskData: Omit<Task, 'id'>): void {
    const newTask: Task = {
      ...taskData,
      id: Date.now().toString(), // Génération simple d'ID
    };
    this.tasks.update(currentTasks => [...currentTasks, newTask]);
  }

  updateTaskStatus(taskId: string, newStatus: 'todo' | 'inProgress' | 'done'): void {
    this.tasks.update(currentTasks =>
      currentTasks.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  }

  updateTask(updatedTask: Task): void {
    this.tasks.update(currentTasks =>
      currentTasks.map(task =>
        task.id === updatedTask.id ? updatedTask : task
      )
    );
  }

  getTaskById(id: string) {
    return computed(() => this.tasks().find(task => task.id === id));
  }
}