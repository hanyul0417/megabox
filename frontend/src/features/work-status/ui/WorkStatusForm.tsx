import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Clock, LogOut } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import workStatusSchema, { type WorkStatusSchemaType } from '../model/schema';
import { BUTTON_LABELS, WORK_STATUS_ACTIONS } from '../model/status';
import { useNow } from '../model/useNow';

import type { WorkAction } from '@/entities/work-status/api/dto';

import { workStatusService } from '@/entities/work-status/api/service';
// eslint-disable-next-line fsd-import/layer-imports
import LogoutBtn from '@/features/login/ui/LogoutBtn';
import { isApiError } from '@/shared/api/error';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Form } from '@/shared/components/ui/form';
import RHFInput from '@/shared/components/ui/RHFInput';
import { formatCurrentDateTime } from '@/shared/lib/date';

const WorkStatusForm = () => {
  const [currentAction, setCurrentAction] = useState<WorkAction | null>(null);
  const now = useNow();
  const { time, date, dayOfWeek } = formatCurrentDateTime(now);

  const form = useForm({
    resolver: zodResolver(workStatusSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // 단일 mutation으로 통합
  const { mutate, isPending } = useMutation({
    mutationFn: ({ action, data }: { action: WorkAction; data: WorkStatusSchemaType }) =>
      workStatusService.changeStatus(action, data),
    onSuccess: (_, variables) => {
      toast.success(`${BUTTON_LABELS[variables.action]} 처리되었습니다.`);
      form.reset();
      setCurrentAction(null);
    },
    onError: (error) => {
      if (isApiError(error)) {
        form.setError('username', {
          message: `${error.message}`,
        });
        form.setError('password', {
          message: `${error.message}`,
        });
      }
      console.log(error);
      setCurrentAction(null);
    },
  });

  // 공통 핸들러
  const handleAction = (action: WorkAction) => {
    return form.handleSubmit((values) => {
      setCurrentAction(action);
      mutate({ action, data: values });
    });
  };

  return (
    <Card variant="brandMain" className="relative">
      <LogoutBtn className="absolute top-4 right-4">
        <LogOut size={20} />
      </LogoutBtn>
      <CardHeader className="flex flex-col gap-2 justify-center items-center">
        <div className="flex gap-2 items-center justify-center">
          <Clock size={20} />
          <p>현재 시각</p>
        </div>
        <CardTitle className="text-4xl font-bold sm:text-5xl">{time}</CardTitle>
        <div>
          {date} {dayOfWeek}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col bg-gray-100 text-black">
        <Form {...form}>
          <form id="work-status-form" className=" flex flex-col gap-2 sm:flex-row w-full">
            <RHFInput
              form={form}
              name="username"
              placeholder="ID"
              disabled={isPending}
              label="아이디"
              className=" w-full"
            />
            <RHFInput
              form={form}
              name="password"
              placeholder="PASSWORD"
              type="password"
              disabled={isPending}
              label="패스워드"
              className="font-sans w-full"
            />
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 p-2 bg-white sm:flex-row sm:p-6">
        {WORK_STATUS_ACTIONS.map(({ action, label, buttonVariant, icon: Icon }) => (
          <Button
            key={action}
            onClick={(e) => void handleAction(action)(e)}
            disabled={isPending}
            variant={buttonVariant}
            size="transparent"
            className="flex-1 w-full sm:w-auto px-6 "
          >
            <div className="flex sm:flex-col justify-center items-center gap-2 sm:flex-1">
              <div className="p-2 rounded-full bg-accent/40">
                <Icon className="size-6" />
              </div>
              {isPending && currentAction === action ? '처리 중...' : label}
            </div>
          </Button>
        ))}
      </CardFooter>
    </Card>
  );
};

export default WorkStatusForm;
