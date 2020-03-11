import { Component, OnInit, ViewChild, ElementRef, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { NzInputDirective } from 'ng-zorro-antd';

interface ItemData {
  id: number;
  value: string;
  relativeTo: string;
  unit: string;
  time: string;
  source: string;
}

@Component({
  selector: 'app-interfacelist',
  templateUrl: './interfacelist.component.html',
  styleUrls: ['./interfacelist.component.css']
})
export class InterfacelistComponent implements OnInit {

  editValueId: number | null;
  editUnitId: number | null;
  editTimeId: number | null;
  editSourceId: number | null;
  readonly VALUE = 'value';
  readonly UNIT = 'unit';
  readonly TIME = 'time';
  readonly SOURCE = 'source';

  @Input('listOfData') listOfData : ItemData[];
  @Input() nextId;
  @ViewChild(NzInputDirective, { static: false, read: ElementRef }) inputElement: ElementRef;

  @Output('changeData') changeDataEmmiter = new EventEmitter<ItemData[]>();

  @HostListener('window:click', ['$event'])
  handleClick(e: MouseEvent): void {
    if(this.inputElement && this.inputElement.nativeElement !== e.target) {
      this.stopEditMode();
    }
  }

  addRow(): void {
    this.listOfData = [
      ...this.listOfData,
      {
        id: this.nextId,
        value: '',
        unit: '',
        relativeTo: '',
        time: '',
        source: '',
      }
    ];
    this.nextId++;
  }

  deleteRow(id: string): void {
    this.listOfData =  this.listOfData.filter(d => d.id !== Number(id));
    this.changeDataEmmiter.emit(this.listOfData);
  }

  startEdit(id: string, event: MouseEvent, type: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.stopEditMode();
    switch (type) {
      case this.VALUE:
        this.editValueId = Number(id);
        break;
      case this.UNIT:
        this.editUnitId = Number(id);
        break;
      case this.TIME:
        this.editTimeId = Number(id);
        break;
      case this.SOURCE:
        this.editSourceId = Number(id);
        break;
    }
  }

  private stopEditMode() {
    this.editValueId = null;
    this.editUnitId = null;
    this.editTimeId = null;
    this.editSourceId = null;
    console.log(this.listOfData);
    this.changeDataEmmiter.emit(this.listOfData);
  }

  keyUpEdit(event) {
    if(event.keyCode === 13) {
      this.stopEditMode();
    }
  }

  ngOnInit(): void {

  }
}
