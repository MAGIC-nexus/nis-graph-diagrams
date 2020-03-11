import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { InterfacelistComponent } from './interfacelist.component';

describe('InterfacelistComponent', () => {
  let component: InterfacelistComponent;
  let fixture: ComponentFixture<InterfacelistComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ InterfacelistComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InterfacelistComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
