import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TargetsCardsComponent } from './targets-cards.component';

describe('TargetsCardsComponent', () => {
  let component: TargetsCardsComponent;
  let fixture: ComponentFixture<TargetsCardsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TargetsCardsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TargetsCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
