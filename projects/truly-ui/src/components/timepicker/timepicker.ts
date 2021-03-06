/*
 MIT License

 Copyright (c) 2018 Temainfo Software

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:
 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.
 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

import {
  Input, AfterContentInit, Optional, Inject, Component, forwardRef, ElementRef, OnInit, ViewChild,
  Renderer2, OnDestroy, Output, EventEmitter, AfterViewInit,
} from '@angular/core';
import { TlLeftPadPipe } from '../internals/pipes/leftpad.pipe';
import { ElementBase } from '../input/core/element-base';
import { NG_ASYNC_VALIDATORS, NG_VALIDATORS, NG_VALUE_ACCESSOR, NgModel } from '@angular/forms';
import { OverlayAnimation } from '../core/directives/overlay-animation';
import { Subscription } from 'rxjs';
import { I18nService } from '../i18n/i18n.service';
import { CdkConnectedOverlay } from '@angular/cdk/overlay';

export interface IncrementalSteps {
  hour: number;
  minute: number;
}

export enum TIME {
  MINUTE = 'minute',
  HOUR = 'hour'
}

@Component( {
  selector: 'tl-timepicker',
  templateUrl: './timepicker.html',
  styleUrls: [ './timepicker.scss' ],
  providers: [ {
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef( () => TlTimepicker ),
    multi: true,
  } ],
  animations: [ OverlayAnimation ]
} )
export class TlTimepicker extends ElementBase<string> implements OnInit, AfterContentInit, AfterViewInit, OnDestroy {

  @Input() format: '12' | '24' = '24';

  @Input() flatBorder = false;

  @Input() showTimeIcon = false;

  @Input() label = '';

  @Input() labelPlacement = 'left';

  @Input() labelSize = '100px';

  @Input() height = '23px';

  @Input() readonly: boolean = null;

  @Input() disabled: boolean = null;

  @Input() withBorder = true;

  @Input() steps: IncrementalSteps = { hour: 1, minute: 1 };

  @Input() availableTimes = [];

  @Input() color = 'basic';

  @Input() name = '';

  @Input() min: Date = new Date(1999, 0, 1, 0, 0);

  @Input() max: Date =  new Date(1999, 0, 1, 23, 59);

  @ViewChild( 'listHour' ) listHour: ElementRef;

  @ViewChild( 'listMinutes' ) listMinutes: ElementRef;

  @ViewChild( 'listAmPm' ) listAmPm: ElementRef;

  @ViewChild( CdkConnectedOverlay ) cdkOverlay: CdkConnectedOverlay;

  @Output() now: EventEmitter<any> = new EventEmitter();

  @Output() changeTime: EventEmitter<string> = new EventEmitter();

  @Output() confirm: EventEmitter<string> = new EventEmitter();

  @Output() cancel: EventEmitter<string> = new EventEmitter();

  @ViewChild(NgModel) model: NgModel;

  public isOpen = false;

  public trigger;

  public nowText = this.i18n.getLocale().TimePicker.now;

  public selectedTime = '10:30 AM';

  public minutes = [];

  public hours = [];

  public minute: number | string = 0;

  public hour: number | string = 0;

  public timeZone = 'AM';

  public value = '';

  public textConfirm = this.i18n.getLocale().TimePicker.textConfirm;

  public textCancel = this.i18n.getLocale().TimePicker.textCancel;

  private headerHeight = 45;

  private border = 3;

  private nullElements = 80;

  private itemHeight = 30;

  private leftPad = new TlLeftPadPipe();

  private listeners: Subscription = new Subscription();

  constructor( @Optional() @Inject( NG_VALIDATORS ) validators: Array<any>,
               @Optional() @Inject( NG_ASYNC_VALIDATORS ) asyncValidators: Array<any>,
               private renderer: Renderer2, private i18n: I18nService ) {
    super( validators, asyncValidators );
  }

  ngOnInit() {}

  ngAfterContentInit() {
    this.handleCreateRing();
    this.listenContainer();
    this.formatTime();
  }

  ngAfterViewInit() {
    this.listenModelChange();
    this.handleOpen();
  }

  handleCreateRing() {
    this.createHourRing();
    this.createMinuteRing();
  }

  createHourRing() {
    let lastHour = this.min.getHours() - this.steps.hour;
    for (let i = 0; i <= this.max.getHours(); i++) {
      if ( i === ( lastHour + this.steps.hour)) {
        this.hours.push(i);
        lastHour = i;
      }
    }
  }

  createMinuteRing() {
    let lastMinute = this.min.getMinutes() - this.steps.minute;
    for (let i = 0; i <= this.max.getMinutes(); i++) {
      if ( i === ( lastMinute + this.steps.minute)) {
        this.minutes.push(i);
        lastMinute = i;
      }
    }
  }

  handleOpen() {
    !this.isOpen ? this.setPointerEvents('none') : this.setPointerEvents('auto');
  }

  changeOpened() {
    this.isOpen = !this.isOpen;
    this.handleOpen();
  }

  private setPointerEvents( value: string ) {
    this.cdkOverlay.overlayRef.overlayElement.style.pointerEvents = value;
  }

  private listenContainer() {
    this.listeners.add( this.renderer.listen( document, 'click', () => {
      this.isOpen = false;
      this.handleOpen();
    } ) );
  }

  private listenModelChange() {
    if (this.model) {
      this.model.valueChanges.subscribe((value) => {
        if (value instanceof Date) {
          this.hour = value.getHours();
          this.minute = value.getMinutes();
          this.formatTime();
          this.value = this.selectedTime;
          this.onChangeValue( this.hour + ':' + this.minute );
        }
      });
    }
  }

  mouseDownContainer( $event ) {
    $event.stopPropagation();
  }

  private emitClickNow() {
    this.now.emit( this.isFormat24() ? this.selectedTime : {
      time: this.selectedTime,
      timeZone: this.timeZone
    } );
  }

  onClickNow() {
    const convert = this.isFormat12() ? this.convertToAmPm( new Date().getHours() ) : new Date().getHours();
    this.hour = this.leftPad.transform( convert, 2 );
    this.minute = this.leftPad.transform( new Date().getMinutes(), 2 );
    this.formatTime();
    this.onChangeValue( this.hour + ':' + this.minute );
    this.emitClickNow();
    this.value = this.selectedTime;
  }

  onScrollHour( $event ) {
    const scroll = Math.round( ( $event.target.scrollTop / this.itemHeight )  );
    this.hour = this.steps.hour > 0 ? (scroll * this.steps.hour) : scroll;
    this.formatTime();
  }

  onScrollMinutes( $event ) {
    const scroll = Math.round( ( $event.target.scrollTop / this.itemHeight )  );
    this.minute = this.steps.minute > 0 ? (scroll * this.steps.minute) : scroll;
    this.formatTime();
  }

  onScrollAmPm( $event ) {
    $event.target.scrollTop >= (this.itemHeight / 2) ? this.timeZone = 'PM' : this.timeZone = 'AM';
  }

  onClickCancel() {
    this.isOpen = false;
    this.cancel.emit( this.selectedTime );
  }

  onClickConfirm() {
    this.isOpen = false;
    this.confirm.emit( this.selectedTime );
    this.value = this.selectedTime;
  }

  onChangeValue( $event ) {
    if ( !$event ) {
      return;
    }
    const split = this.cleanValue( $event ).split( ':' );
    if ( split[ 0 ].length >= 2 ) {
      this.hour = this.isFormat12() ? this.leftPad.transform( this.convertToAmPm( split[ 0 ] ), 2 ) : split[ 0 ];
      this.setScrollColumn( this.listHour.nativeElement, TIME.HOUR );
    }
    if ( split[ 1 ].length >= 2 ) {
      this.minute = split[ 1 ];
      this.setScrollColumn( this.listMinutes.nativeElement,  TIME.MINUTE );
    }
  }

  private setScrollColumn( elementScroll: HTMLElement, type: TIME ) {
    const element: any = this.getDataIndex( type );
    if ( element ) {
      setTimeout(() => {
        elementScroll.scrollTop =
          element.offsetTop - ( this.nullElements + this.headerHeight + this.border ) - this.itemHeight;
      }, 100);
    }
  }

  private getDataIndex( type: TIME ) {
    return type === TIME.HOUR ? this.getItemByDataIndexHour() : this.getItemByDataIndexMinute();
  }

  private convertToAmPm( hour ) {
    const timeString = hour + ':00:00';
    const hourEnd = timeString.indexOf( ':' );
    const H = +timeString.substr( 0, hourEnd );
    this.timeZone = H < 12 ? 'AM' : 'PM';
    this.timeZone === 'AM' ? this.setAm() : this.setPm();
    return H % 12 || 12;
  }

  private getItemByDataIndexMinute() {
    const strDataIndex: string = 'div[dataIndexMinute="' + this.minute + '"]';
    return document.querySelector( strDataIndex );
  }

  private getItemByDataIndexHour() {
    const strDataIndex: string = 'div[dataIndexHour="' + this.hour + '"]';
    return document.querySelector( strDataIndex );
  }

  private cleanValue( value ) {
    return value.replace( /_/g, '' );
  }

  private isFormat24() {
    return this.format === '24';
  }

  private isFormat12() {
    return this.format === '12';
  }

  isTimeZonePM() {
    return this.timeZone === 'PM';
  }

  isTimeZoneAM() {
    return this.timeZone === 'AM';
  }

  clickListItem( scrollElement, $event ) {
    scrollElement.scrollTop =
      $event.target.offsetTop - ( this.nullElements + this.headerHeight + this.border ) - this.itemHeight;
    setTimeout(() => { this.value = this.selectedTime; }, 100);
  }

  setAm() {
    if ( this.listAmPm ) {
      this.listAmPm.nativeElement.scrollTop = 0;
    }
  }

  setPm() {
    if ( this.listAmPm ) {
      this.listAmPm.nativeElement.scrollTop = this.itemHeight * 2;
    }
  }

  private formatTime() {
    this.selectedTime = this.leftPad.transform( this.hour, 2 ) + ':' + this.leftPad.transform( this.minute, 2 );
  }

  ngOnDestroy() {
    this.listeners.unsubscribe();
  }

}
