import { Component, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { TaskService } from '../../../services/tasks/task-service.service';
import { Task } from './task.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss'],
})
export class TasksComponent implements OnInit {
  taskService = inject(TaskService);

  // Utilisation des signaux calculés du service
  todo = this.taskService.todoTasks;
  inProgress = this.taskService.inProgressTasks;
  done = this.taskService.doneTasks;

  showAddTaskModal = false;
  newTaskTitle = '';
  newTaskDescription = '';
  newTaskAssignee = '';
  addTaskStatus: 'todo' | 'inProgress' | 'done' = 'todo';

  constructor() {
    // Recharge si currentCampaignId change dans le localStorage
    // (le userId est maintenant géré par les cookies HTTP-only)
    effect(() => {
      const campaignId = localStorage.getItem('currentCampaignId');
      // On relance fetchTasks si l'ID de la campagne change
      this.taskService.fetchTasks();
    });
  }

  ngOnInit(): void {
    // Charge les tâches à l'initialisation selon le cookie userId et currentCampaignId
    this.taskService.fetchTasks();
  }

  openAddTaskModal(status: 'todo' | 'inProgress' | 'done') {
    this.addTaskStatus = status;
    this.showAddTaskModal = true;
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.newTaskAssignee = '';
  }

  closeAddTaskModal() {
    this.showAddTaskModal = false;
  }

  addTask() {
    if (!this.newTaskTitle.trim()) {
      alert('Le titre de la tâche est requis.');
      return;
    }
    this.taskService.addTask({
      title: this.newTaskTitle,
      description: this.newTaskDescription,
      assignee: this.newTaskAssignee,
      status: this.addTaskStatus
    });
    this.closeAddTaskModal();
    // L'ajout est fluide car le service met à jour le signal local dès la réponse du backend
  }

  drop(event: CdkDragDrop<Task[]>, newStatus: 'todo' | 'inProgress' | 'done'): void {
    if (event.previousContainer === event.container) {
      // Optionnel : réorganisation locale
    } else {
      const taskToMove = event.previousContainer.data[event.previousIndex];
      this.taskService.updateTaskStatus(taskToMove.id, newStatus);
      // Les signaux sont mis à jour automatiquement après la réponse backend
    }
  }

  getConnectedLists(): string[] {
    return ['todoList', 'inProgressList', 'doneList'];
  }

  editTaskId: string | null = null;
  editTaskTitle = '';
  editTaskDescription = '';
  editTaskAssignee = '';
  editTaskStatus: 'todo' | 'inProgress' | 'done' = 'todo';
  showEditTaskModal = false;

  openEditTaskModal(task: Task) {
    this.editTaskId = task.id;
    this.editTaskTitle = task.title;
    this.editTaskDescription = task.description || '';
    this.editTaskAssignee = task.assignee || '';
    this.editTaskStatus = task.status;
    this.showEditTaskModal = true;
  }

  closeEditTaskModal() {
    this.showEditTaskModal = false;
    this.editTaskId = null;
  }

  updateTask() {
    if (!this.editTaskId) return;
    this.taskService.updateTask({
      id: this.editTaskId,
      title: this.editTaskTitle,
      description: this.editTaskDescription,
      assignee: this.editTaskAssignee,
      status: this.editTaskStatus
    });
    this.closeEditTaskModal();
  }

  deleteTask() {
    if (!this.editTaskId) return;
    this.taskService.deleteTask(this.editTaskId);
    this.closeEditTaskModal();
  }
}