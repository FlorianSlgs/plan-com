import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoalsCardsComponent } from './goals-cards.component';

describe('GoalsCardsComponent', () => {
  let component: GoalsCardsComponent;
  let fixture: ComponentFixture<GoalsCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoalsCardsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoalsCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
