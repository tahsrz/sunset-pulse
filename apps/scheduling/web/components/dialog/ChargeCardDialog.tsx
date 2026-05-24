import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import { Dialog } from "@calcom/features/components/controlled-dialog";
const DialogAny = Dialog as any;
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader, DialogClose } from "@calcom/ui/components/dialog";
const DialogContentAny = DialogContent as any;
const DialogFooterAny = DialogFooter as any;
const DialogHeaderAny = DialogHeader as any;
const DialogCloseAny = DialogClose as any;
import { showToast } from "@calcom/ui/components/toast";
import { CreditCardIcon, TriangleAlertIcon } from "@coss/ui/icons";

interface IRescheduleDialog {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  bookingId: number;
  paymentAmount: number;
  paymentCurrency: string;
}

export const ChargeCardDialog = (props: IRescheduleDialog) => {
  const { t } = useLocale();
  const utils = (trpc as any).useUtils();
  const { isOpenDialog, setIsOpenDialog, bookingId } = props;
  const [chargeError, setChargeError] = useState<string | null>(null);

  const chargeCardMutation = {
    mutate: (_args: { bookingId: number }) => {
      utils.viewer.bookings.invalidate();
      setIsOpenDialog(false);
      setChargeError(null);
      showToast("Charge successful", "success");
    },
    isPending: false,
  };

  const currencyStringParams = {
    amount: props.paymentAmount / 100.0,
    formatParams: { amount: { currency: props.paymentCurrency } },
  };

  return (
    <DialogAny open={isOpenDialog} onOpenChange={setIsOpenDialog}>
      <DialogContentAny>
        <div className="flex flex-row space-x-3">
          <div className=" bg-subtle flex h-10 w-10 shrink-0 justify-center rounded-full">
            <CreditCardIcon className="m-auto h-6 w-6" />
          </div>
          <div className="pt-1">
            <DialogHeaderAny title={t("charge_card")} />
            <p>{t("charge_card_dialog_body", currencyStringParams)}</p>

            {chargeError && (
              <div className="mt-4 flex text-red-500">
                <TriangleAlertIcon className="mr-2 h-5 w-5" />
                <p className="text-sm">{chargeError}</p>
              </div>
            )}

            <DialogFooterAny>
              <DialogCloseAny />
              <Button
                data-testid="send_request"
                disabled={chargeCardMutation.isPending}
                onClick={() => {
                  setChargeError(null);
                  chargeCardMutation.mutate({
                    bookingId,
                  });
                }}>
                {t("charge_attendee", currencyStringParams)}
              </Button>
            </DialogFooterAny>
          </div>
        </div>
      </DialogContentAny>
    </DialogAny>
  );
};
