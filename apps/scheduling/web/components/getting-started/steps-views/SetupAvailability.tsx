import { useForm } from "react-hook-form";

import Schedule from "@calcom/web/modules/schedules/components/Schedule";
import { DEFAULT_SCHEDULE } from "@calcom/lib/availability";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form } from "@calcom/ui/components/form";
const FormAny = Form as any;

import type { TRPCClientErrorLike } from "@trpc/client";

interface ISetupAvailabilityProps {
  nextStep: () => void;
  defaultScheduleId?: number | null;
}

const SetupAvailability = (props: ISetupAvailabilityProps) => {
  const { defaultScheduleId } = props;

  const { t } = useLocale();
  const { nextStep } = props;

  const scheduleId = defaultScheduleId === null ? undefined : defaultScheduleId;
  const queryAvailability = (trpc as any).viewer.availability.schedule.get.useQuery(
    { scheduleId: defaultScheduleId ?? undefined },
    {
      enabled: !!scheduleId,
    }
  );

  const availabilityForm = useForm({
    defaultValues: {
      schedule: queryAvailability?.data?.availability || DEFAULT_SCHEDULE,
    },
  });

  const mutationOptions = {
    onError: (error: TRPCClientErrorLike<any>) => {
      throw new Error(error.message);
    },
    onSuccess: () => {
      nextStep();
    },
  };
  const createSchedule = (trpc as any).viewer.availability.schedule.create.useMutation(mutationOptions);
  const updateSchedule = (trpc as any).viewer.availability.schedule.update.useMutation(mutationOptions);
  return (
    <FormAny
      form={availabilityForm}
      handleSubmit={async (values: any) => {
        try {
          if (defaultScheduleId) {
            await updateSchedule.mutateAsync({
              scheduleId: defaultScheduleId,
              name: t("default_schedule_name"),
              ...values,
            });
          } else {
            await createSchedule.mutateAsync({
              name: t("default_schedule_name"),
              ...values,
            });
          }
        } catch (error) {
          if (error instanceof Error) {
            // setError(error);
            // @TODO: log error
          }
        }
      }}>
      <div className="bg-default dark:text-inverted text-emphasis border-subtle w-full rounded-md border">
        <Schedule control={availabilityForm.control} name="schedule" weekStart={1} />
      </div>

      <div>
        <Button
          EndIcon="arrow-right"
          data-testid="save-availability"
          type="submit"
          className="mt-2 w-full justify-center p-2 text-sm sm:mt-8"
          loading={availabilityForm.formState.isSubmitting}
          disabled={availabilityForm.formState.isSubmitting}>
          {t("complete_profile")}
        </Button>
      </div>
    </FormAny>
  );
};

export { SetupAvailability };
