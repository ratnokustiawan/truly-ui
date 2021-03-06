import {InjectionToken} from '@angular/core';

export interface DropdownConfig {
  labelSize?: string;
  maxHeight?: string;
  itemHeight?: string;
  width?: string;
  labelPlacement?: string;
  color?: string;
  keyText?: string;
  keyValue?: string;
  debounceTime?: number;
}

export let DROPDOWN_CONFIG = new InjectionToken<DropdownConfig>('dropdown.config');
