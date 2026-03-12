import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { useLoginMutation } from '../api/queries';
import loginSchema, { type LoginSchemaType } from '../model/schema';

import RHFInput from './RHFinput';

import { isApiError } from '@/shared/api/error';
import { Button } from '@/shared/components/ui/button';
import { Form } from '@/shared/components/ui/form';

const LoginForm = () => {
  const form = useForm<LoginSchemaType>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const { mutate: login, isPending } = useLoginMutation();

  const onSubmit = (values: LoginSchemaType) => {
    login(values, {
      onError: (error) => {
        if (isApiError(error)) {
          switch (error.status) {
            case 401:
              form.setError('username', { message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
              form.setError('password', { message: '아이디 또는 비밀번호가 올바르지 않습니다.' });
              return;
            case 403:
              toast.error(error.message);
              return;
            case 429:
              toast.error(error.message);
              return;
            case 422:
              toast.error(error.message);
              return;
            case 500:
              toast.error('서버 오류가 발생했습니다.');
              return;
            default:
              toast.error(error.message ?? '알 수 없는 오류가 발생했습니다.');
              return;
          }
        }
        toast.error('네트워크 오류가 발생했습니다.');
      },
    });
  };

  return (
    <Form {...form}>
      <form
        id="login-form"
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="flex flex-col gap-3"
      >
        <RHFInput
          form={form}
          name="username"
          label="아이디"
          placeholder="아이디를 입력하세요"
          className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
        />
        <RHFInput
          type="password"
          form={form}
          name="password"
          label="비밀번호"
          placeholder="비밀번호를 입력하세요"
          className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
        />
        <Button
          type="submit"
          className="mt-2 h-11 w-full bg-mega hover:bg-mega-secondary text-white font-medium rounded-xl transition-all duration-200 active:scale-[0.98]"
          disabled={isPending}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              로그인 중...
            </span>
          ) : (
            '로그인'
          )}
        </Button>
      </form>
    </Form>
  );
};

export default LoginForm;
