import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TaskService } from '../../services/task-service.service';
import { Task } from '../../task.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, DragDropModule, FormsModule],
  templateUrl: './kanban.component.html',
  styleUrls: ['./kanban.component.scss'],
})
export class KanbanBoardComponent {
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
      status: this.addTaskStatus // <-- Ajoute cette ligne
    });
    this.closeAddTaskModal();
  }

  drop(event: CdkDragDrop<Task[]>, newStatus: 'todo' | 'inProgress' | 'done'): void {
    if (event.previousContainer === event.container) {
      // Déplacement dans la même colonne (réorganisation)
      // Optionnel : implémenter la logique de réorganisation si nécessaire
      // moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Déplacement vers une autre colonne (changement de statut)
      const taskToMove = event.previousContainer.data[event.previousIndex];
      this.taskService.updateTaskStatus(taskToMove.id, newStatus);

      // Note: La mise à jour via le service et les signaux devrait automatiquement
      // rafraîchir les listes. Si ce n'est pas le cas ou pour une UI plus réactive
      // avant la mise à jour effective des signaux, vous pourriez utiliser transferArrayItem
      // sur des copies locales des listes, mais la source de vérité reste le service.
    }
  }

  // Méthode pour connecter les listes de dépôt CdkDropList
  getConnectedLists(): string[] {
    return ['todoList', 'inProgressList', 'doneList'];
  }
}