import { Component } from '@angular/core';
import { GoalsCardsComponent } from '../goals-cards/goals-cards.component';
import { FormsModule } from '@angular/forms';
import { GoalsService } from '../../../../services/goals/goals.service';
import { OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface GoalCard {
  id: string; // Ajoute cette ligne
  title: string;
  imageUrl: string;
  description: string;
  items: string[];
}

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [GoalsCardsComponent, FormsModule, CommonModule],
  templateUrl: './goals.component.html',
  styleUrl: './goals.component.scss'
})
export class GoalsComponent implements OnInit {
  cards: GoalCard[] = [ /* ... */ ];

  showAddCardModal = false;

  // Champs du formulaire d'ajout
  newTitle = '';
  newDescription = '';
  newItems = '';
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  // Champs du formulaire d'édition
  editIndex: number | null = null;
  editTitle = '';
  editDescription = '';
  editItems = '';
  editImagePreview: string | null = null;
  editSelectedFile: File | null = null;
  editGoalId: string | null = null;

  constructor(private goalsService: GoalsService) {}

  ngOnInit() {
    this.loadGoals();
  }

  loadGoals() {
    const userId = localStorage.getItem('userId');
    const currentCampaign = localStorage.getItem('currentCampaign');
    if (!userId || !currentCampaign) {
      this.cards = [];
      return;
    }
    this.goalsService.getGoalsByUserAndCampaign(userId, currentCampaign).subscribe({
      next: goals => {
        this.cards = goals.map(goal => ({
        id: goal.id, // Ajoute cette ligne
        title: goal.goals_name,
        description: goal.goals_description,
        items: Array.isArray(goal.subgoals)
          ? goal.subgoals
          : (typeof goal.subgoals === 'string'
              ? JSON.parse(goal.subgoals)
              : []),
        imageUrl: `http://localhost:3000/uploads/goals_images/${goal.goals_imageurl}`
      }));
      },
      error: () => {
        this.cards = [];
      }
    });
  }

  openAddCardModal() {
    this.showAddCardModal = true;
    this.newTitle = '';
    this.newDescription = '';
    this.newItems = '';
    this.selectedFile = null;
  }

  closeAddCardModal() {
    this.showAddCardModal = false;
    this.imagePreview = null;
  }

  onFileSelected(event: any) {
    let files: FileList | null = null;
    if (event.target && event.target.files) {
      files = event.target.files;
    } else if (event.files) {
      files = event.files;
    }
    if (files && files.length > 0) {
      this.selectedFile = files[0];

      // Génère un aperçu de l'image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  addCard() {
    if (!this.newTitle.trim() || !this.selectedFile) return;

    const userId = localStorage.getItem('userId');
    const currentCampaign = localStorage.getItem('currentCampaign'); // ici c'est le nom
    if (!userId || !currentCampaign) {
      alert('Utilisateur ou campagne non sélectionné.');
      return;
    }

    // Utilise le nom de la campagne
    const campaignName = currentCampaign;

    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('campaignName', campaignName); // <-- envoie le nom
    formData.append('title', this.newTitle);
    formData.append('description', this.newDescription);
    formData.append('subgoals', JSON.stringify(
      this.newItems.split(',').map(item => item.trim()).filter(Boolean)
    ));
    formData.append('image', this.selectedFile);

    this.goalsService.uploadGoalImage(formData).subscribe({
      next: (res: any) => {
        this.closeAddCardModal();
        this.loadGoals();
      },
      error: () => {
        alert('Erreur lors de l\'upload de l\'image');
      }
    });
  }

  onDragOver(event: DragEvent) {
  event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.onFileSelected({ files: event.dataTransfer.files });
    }
  }

  onEditCard(index: number) {
    const card = this.cards[index];
    this.editIndex = index;
    this.editTitle = card.title;
    this.editDescription = card.description;
    this.editItems = card.items.join(', ');
    this.editImagePreview = card.imageUrl;
    this.editSelectedFile = null;
    this.editGoalId = card.id;
  }

  onEditFileSelected(event: any) {
    let files: FileList | null = null;
    if (event.target && event.target.files) {
      files = event.target.files;
    } else if (event.files) {
      files = event.files;
    }
    if (files && files.length > 0) {
      this.editSelectedFile = files[0];

      // Génère un aperçu de l'image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editImagePreview = e.target.result;
      };
      reader.readAsDataURL(this.editSelectedFile);
    }
  }

  onEditDrop(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.onEditFileSelected({ files: event.dataTransfer.files });
    }
  }

  updateCard() {
    if (!this.editTitle.trim() || !this.editGoalId) return;

    const formData = new FormData();
    formData.append('title', this.editTitle);
    formData.append('description', this.editDescription);
    formData.append('subgoals', JSON.stringify(
      this.editItems.split(',').map(item => item.trim()).filter(Boolean)
    ));
    if (this.editSelectedFile) {
      formData.append('image', this.editSelectedFile);
    }

    this.goalsService.updateGoal(this.editGoalId, formData).subscribe({
      next: () => {
        this.closeEditModal();
        this.loadGoals();
      },
      error: () => {
        alert('Erreur lors de la mise à jour');
      }
    });
  }

  closeEditModal() {
    this.editIndex = null;
    this.editGoalId = null;
    this.editImagePreview = null;
  }
}