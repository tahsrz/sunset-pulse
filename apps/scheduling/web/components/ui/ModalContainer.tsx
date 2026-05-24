import classNames from "classnames";
import type { PropsWithChildren } from "react";
import React from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
const DialogAny = Dialog as any;
import { DialogContent } from "@calcom/ui/components/dialog";
const DialogContentAny = DialogContent as any;

export default function ModalContainer(
  props: PropsWithChildren<{
    wide?: boolean;
    scroll?: boolean;
    noPadding?: boolean;
    isOpen: boolean;
    onExit: () => void;
  }>
) {
  return (
    <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
      <DialogAny open={props.isOpen} onOpenChange={(val: any) => props.onExit()}>
        <DialogContentAny>
          <div
            className={classNames(
              "bg-default inline-block w-full transform text-left align-bottom transition-all sm:align-middle",
              {
                "sm:w-full sm:max-w-lg ": !props.wide,
                "sm:w-4xl sm:max-w-4xl": props.wide,
                "overflow-auto": props.scroll,
                "p-0!": props.noPadding,
              }
            )}>
            {props.children}
          </div>
        </DialogContentAny>
      </DialogAny>
    </div>
  );
}
