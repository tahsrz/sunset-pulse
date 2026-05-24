import { Dialog } from "@calcom/features/components/controlled-dialog";
const DialogAny = Dialog as any;
import ServerTrans from "@calcom/lib/components/ServerTrans";
const ServerTransAny = ServerTrans as any;
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { DialogContent, DialogFooter, DialogClose } from "@calcom/ui/components/dialog";
const DialogContentAny = DialogContent as any;

interface SecondaryEmailConfirmModalProps {
  email: string;
  onCancel: () => void;
}

const SecondaryEmailConfirmModal = ({ email, onCancel }: SecondaryEmailConfirmModalProps) => {
  const { t } = useLocale();

  return (
    <DialogAny open={true}>
      <DialogContentAny
        title={t("confirm_email")}
        description={<ServerTransAny t={t} i18nKey="confirm_email_description" values={{ email }} />}
        type="creation"
        data-testid="secondary-email-confirm-dialog">
        <DialogFooter>
          <DialogClose color="primary" onClick={onCancel} data-testid="secondary-email-confirm-done-button">
            {t("done")}
          </DialogClose>
        </DialogFooter>
      </DialogContentAny>
    </DialogAny>
  );
};

export default SecondaryEmailConfirmModal;
