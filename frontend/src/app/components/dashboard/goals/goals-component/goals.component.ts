import { Component } from '@angular/core';
import { GoalsCardsComponent } from '../goals-cards/goals-cards.component';
import { FormsModule } from '@angular/forms';
import { GoalsService } from '../../../../services/goals/goals.service';
import { OnInit } from '@angular/core';

interface GoalCard {
  title: string;
  imageUrl: string;
  description: string;
  items: string[];
}

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [GoalsCardsComponent, FormsModule],
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
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
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
}