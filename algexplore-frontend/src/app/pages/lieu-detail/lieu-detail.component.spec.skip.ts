import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LieuDetailComponent } from './lieu-detail.component';

describe('LieuDetailComponent', () => {
  let component: LieuDetailComponent;
  let fixture: ComponentFixture<LieuDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LieuDetailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LieuDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
