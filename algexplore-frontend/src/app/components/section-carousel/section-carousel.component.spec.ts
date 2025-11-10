import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SectionCarouselComponent } from './section-carousel.component';

describe('SectionCarouselComponent', () => {
  let component: SectionCarouselComponent;
  let fixture: ComponentFixture<SectionCarouselComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SectionCarouselComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SectionCarouselComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
