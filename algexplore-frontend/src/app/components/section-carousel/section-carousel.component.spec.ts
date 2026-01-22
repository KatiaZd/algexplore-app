import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { SectionCarouselComponent } from './section-carousel.component';
import { Lieu } from '../../services/lieu.service';

describe('SectionCarouselComponent', () => {
  let fixture: ComponentFixture<SectionCarouselComponent>;
  let component: SectionCarouselComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionCarouselComponent], // garde CommonModule + template OK
      schemas: [CUSTOM_ELEMENTS_SCHEMA], // ignore <app-lieu-card>
    }).compileComponents();

    fixture = TestBed.createComponent(SectionCarouselComponent);
    component = fixture.componentInstance;
  });

  it('should create and render title', () => {
    component.title = 'Flux de sorties';
    fixture.detectChanges();

    const h2: HTMLElement | null = fixture.nativeElement.querySelector('h2');
    expect(h2).toBeTruthy();
    expect(h2?.textContent).toContain('Flux de sorties');
  });

  it('should render one lieu card per lieu', () => {
    const lieux: Lieu[] = [
      { id: 1, nom: 'Lieu 1' } as Lieu,
      { id: 2, nom: 'Lieu 2' } as Lieu,
      { id: 3, nom: 'Lieu 3' } as Lieu,
    ];

    component.title = 'Section test';
    component.lieux = lieux;
    fixture.detectChanges();

    const cards = fixture.debugElement.queryAll(By.css('app-lieu-card'));
    expect(cards.length).toBe(lieux.length);
  });
});
