import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from '../button/index';
import { DialogService } from './dialog.service';
import { TlDialogInfo } from './dialog-info/dialog-info';
import { TlDialogAlert } from './dialog-alert/dialog-alert';
import { TlDialogError } from './dialog-error/dialog-error';
import { TlDialogConfirmation } from './dialog-confirmation/dialog-confirmation';
import { ModalService } from '../modal/modal.service';
import { ModalModule } from '../modal/index';

export * from '../dialog';

@NgModule( {
    imports: [
        CommonModule,
        ButtonModule,
        ModalModule
    ],
    declarations: [
        TlDialogInfo,
        TlDialogAlert,
        TlDialogError,
        TlDialogConfirmation
    ],
    exports: [
        TlDialogInfo,
        TlDialogAlert,
        TlDialogError,
        TlDialogConfirmation
    ],
    entryComponents: [
        TlDialogInfo,
        TlDialogAlert,
        TlDialogError,
        TlDialogConfirmation
    ],
    providers: [ModalService, DialogService]
} )
export class DialogModule {

}